use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use futures_util::StreamExt;
use std::fs;
use std::path::PathBuf;

/// Predefined models available for download from Hugging Face.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelEntry {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub url: String,
    pub size_bytes: u64,
    pub description: String,
    pub is_default: bool,
    /// Prompt template for this model. Use `{message}` as the placeholder.
    pub chat_template: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelStatus {
    #[serde(flatten)]
    pub entry: ModelEntry,
    pub downloaded: bool,
    pub local_path: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct DownloadProgress {
    pub model_id: String,
    pub percent: f32,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

pub fn model_registry() -> Vec<ModelEntry> {
    vec![
        // Default: Ministral 3B Q4_K_M – works on machines with 4 GB+ RAM.
        // Q8_0 (below) requires ~5 GB free RAM and causes NullResult on low-memory systems.
        ModelEntry {
            id: "ministral-3b-q4".to_string(),
            name: "Ministral 3B Q4".to_string(),
            filename: "mistralai_Ministral-3-3B-Instruct-2512-Q4_K_M.gguf".to_string(),
            url: "https://huggingface.co/bartowski/mistralai_Ministral-3-3B-Instruct-2512-GGUF/resolve/main/mistralai_Ministral-3-3B-Instruct-2512-Q4_K_M.gguf".to_string(),
            size_bytes: 2_100_000_000,
            description: "Ministral 3B – Q4_K_M (~2.0 GB) – rekommenderas".to_string(),
            is_default: true,
            chat_template: "<s>[INST] {message} [/INST]".to_string(),
        },
        ModelEntry {
            id: "gemma-3n-e2b".to_string(),
            name: "Gemma 3n E2B".to_string(),
            filename: "google_gemma-3n-E2B-it-Q4_K_M.gguf".to_string(),
            url: "https://huggingface.co/bartowski/google_gemma-3n-E2B-it-GGUF/resolve/main/google_gemma-3n-E2B-it-Q4_K_M.gguf".to_string(),
            size_bytes: 1_850_000_000,
            description: "Google Gemma 3n – 2B params, Q4 (~1.7 GB)".to_string(),
            is_default: false,
            chat_template: "<start_of_turn>user\n{message}\n<end_of_turn>\n<start_of_turn>model\n".to_string(),
        },
        ModelEntry {
            id: "ministral-3b".to_string(),
            name: "Ministral 3B Q8".to_string(),
            filename: "Ministral-3-3B-Instruct-2512-Q8_0.gguf".to_string(),
            url: "https://huggingface.co/ggml-org/Ministral-3-3B-Instruct-2512-GGUF/resolve/main/Ministral-3-3B-Instruct-2512-Q8_0.gguf".to_string(),
            size_bytes: 3_651_679_744,
            description: "Ministral 3B – Q8_0 (~3.4 GB) – kräver 5+ GB ledigt RAM".to_string(),
            is_default: false,
            chat_template: "<s>[INST] {message} [/INST]".to_string(),
        },
    ]
}

fn models_dir(app: &tauri::AppHandle) -> PathBuf {
    crate::get_app_dir(app).join("models")
}

pub fn list_models_with_status(app: &tauri::AppHandle) -> Vec<ModelStatus> {
    let dir = models_dir(app);
    model_registry()
        .into_iter()
        .map(|entry| {
            let path = dir.join(&entry.filename);
            let legacy_filename = entry.filename.replace("-E2B", "_E2B");
            let legacy_path = dir.join(&legacy_filename);
            
            let downloaded = path.exists() || legacy_path.exists();
            let final_path = if path.exists() {
                Some(path.to_string_lossy().to_string())
            } else if legacy_path.exists() {
                Some(legacy_path.to_string_lossy().to_string())
            } else {
                None
            };

            ModelStatus {
                local_path: final_path,
                downloaded,
                entry,
            }
        })
        .collect()
}

pub fn get_default_model_path(app: &tauri::AppHandle) -> Option<String> {
    let dir = models_dir(app);
    model_registry()
        .into_iter()
        .find(|e| e.is_default)
        .and_then(|entry| {
            let path = dir.join(&entry.filename);
            let legacy_filename = entry.filename.replace("-E2B", "_E2B");
            let legacy_path = dir.join(&legacy_filename);

            if path.exists() {
                Some(path.to_string_lossy().to_string())
            } else if legacy_path.exists() {
                Some(legacy_path.to_string_lossy().to_string())
            } else {
                None
            }
        })
}

pub async fn download_model(model_id: String, app: AppHandle) -> Result<String, String> {
    let entry = model_registry()
        .into_iter()
        .find(|e| e.id == model_id)
        .ok_or_else(|| format!("Okänd modell: {}", model_id))?;

    let dir = models_dir(&app);
    fs::create_dir_all(&dir).map_err(|e| format!("Kunde inte skapa katalog: {}", e))?;

    let dest = dir.join(&entry.filename);

    // If already downloaded, return immediately
    if dest.exists() {
        return Ok(dest.to_string_lossy().to_string());
    }

    // Download with progress
    let client = reqwest::Client::new();
    let response = client
        .get(&entry.url)
        .send()
        .await
        .map_err(|e| format!("Nedladdningsfel: {}", e))?;

    // Validate HTTP status – HF returns 404 with "Entry not found" for wrong filenames
    if !response.status().is_success() {
        return Err(format!("Nedladdningsfel: HTTP {}", response.status()));
    }

    let total = response.content_length().unwrap_or(entry.size_bytes);
    let mut downloaded: u64 = 0;

    // Write to temp file, then rename (atomic)
    let tmp_path = dest.with_extension("gguf.part");
    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| format!("Kunde inte skapa fil: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut last_percent: i32 = -1;

    use tokio::io::AsyncWriteExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Nedladdningsfel: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Skrivfel: {}", e))?;

        downloaded += chunk.len() as u64;
        let percent = ((downloaded as f64 / total as f64) * 100.0) as i32;

        // Only emit every 1%
        if percent != last_percent {
            last_percent = percent;
            let _ = app.emit(
                "download-progress",
                DownloadProgress {
                    model_id: model_id.clone(),
                    percent: percent as f32,
                    downloaded_bytes: downloaded,
                    total_bytes: total,
                },
            );
        }
    }

    file.sync_all().await.map_err(|e| format!("Sync-fel: {}", e))?;
    drop(file);

    // Fallback till kopiering för Windows om filen fortfarande är låst
    if let Err(_e) = std::fs::rename(&tmp_path, &dest) {
        std::fs::copy(&tmp_path, &dest).map_err(|e| format!("Kunde inte kopiera temp-filen: {}", e))?;
        let _ = std::fs::remove_file(&tmp_path);
    }

    let _ = app.emit("download-complete", model_id.clone());

    Ok(dest.to_string_lossy().to_string())
}
