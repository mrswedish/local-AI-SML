import os
import json
import shutil
import argparse

# === Configuration ===
BIN_DIR = "src-tauri/runtime/llama-cpp/bin"
ARCH_SUFFIX = "-aarch64-apple-darwin"
TAURI_CONFIG_PATH = "src-tauri/tauri.conf.json"
TAURI_CONFIG_BACKUP = "src-tauri/tauri.conf.backup.json"
CAPABILITIES_PATH = "src-tauri/capabilities/default.json"
CAPABILITIES_BACKUP = "src-tauri/capabilities/default.backup.json"

base_tauri_config = {
    "$schema": "https://schema.tauri.app/config/2",
    "productName": "frontend",
    "version": "0.1.0",
    "identifier": "com.frontend.app",
    "build": {
        "beforeDevCommand": "npm run dev",
        "devUrl": "http://localhost:1420",
        "beforeBuildCommand": "npm run build",
        "frontendDist": "../dist"
    },
    "app": {
        "windows": [
            {
                "title": "frontend",
                "width": 800,
                "height": 600
            }
        ],
        "security": {
            "csp": None
        }
    },
    "bundle": {
        "active": True,
        "targets": "all",
        "icon": [
            "icons/32x32.png",
            "icons/128x128.png",
            "icons/128x128@2x.png",
            "icons/icon.icns",
            "icons/icon.ico"
        ],
        "externalBin": []
    }
}

def revert_binaries():
    for filename in os.listdir(BIN_DIR):
        if filename.endswith(ARCH_SUFFIX):
            original_name = filename[:-len(ARCH_SUFFIX)]
            os.rename(
                os.path.join(BIN_DIR, filename),
                os.path.join(BIN_DIR, original_name)
            )
            print(f"Reverted: {filename} -> {original_name}")

def rename_binaries():
    binaries = []

    for filename in os.listdir(BIN_DIR):
        full_path = os.path.join(BIN_DIR, filename)
        if os.path.isfile(full_path) and not filename.startswith("."):
            if not filename.endswith(ARCH_SUFFIX):
                renamed = f"{filename}{ARCH_SUFFIX}"
                os.rename(full_path, os.path.join(BIN_DIR, renamed))
                print(f"Renamed: {filename} -> {renamed}")
                binaries.append(filename)  # use original name for config
            else:
                binaries.append(filename[:-len(ARCH_SUFFIX)])  # remove suffix for config

    return binaries

def write_tauri_config(binaries):
    config = base_tauri_config
    if os.path.exists(TAURI_CONFIG_PATH):
        with open(TAURI_CONFIG_PATH, "r") as f:
            config = json.load(f)
        shutil.copy(TAURI_CONFIG_PATH, TAURI_CONFIG_BACKUP)
        print(f"Backed up tauri.conf.json to {TAURI_CONFIG_BACKUP}")

    rel_paths = [os.path.normpath(os.path.join("runtime/llama-cpp/bin", name)) for name in binaries]
    config["bundle"]["externalBin"] = rel_paths

    with open(TAURI_CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)
        print("✅ Updated tauri.conf.json")

def update_capabilities(binaries):
    if not os.path.exists(CAPABILITIES_PATH):
        print("⚠️  capabilities/default.json not found — skipping update.")
        return

    with open(CAPABILITIES_PATH, "r") as f:
        cap_config = json.load(f)
    shutil.copy(CAPABILITIES_PATH, CAPABILITIES_BACKUP)
    print(f"Backed up capabilities/default.json to {CAPABILITIES_BACKUP}")

    permissions = cap_config.get("permissions", [])
    shell_perm = next(
        (p for p in permissions if isinstance(p, dict) and p.get("identifier") == "shell:allow-execute"),
        None
    )

    if not shell_perm:
        shell_perm = {
            "identifier": "shell:allow-execute",
            "allow": []
        }
        permissions.append(shell_perm)

    allow_list = []
    for binary in binaries:
        allow_list.append({
            "name": os.path.normpath(os.path.join("runtime/llama-cpp/bin", binary)),
            "sidecar": True
        })

    shell_perm["allow"] = allow_list
    cap_config["permissions"] = permissions

    with open(CAPABILITIES_PATH, "w") as f:
        json.dump(cap_config, f, indent=2)
        print("✅ Updated capabilities/default.json")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update Tauri sidecar binaries and configs.")
    parser.add_argument(
        "-or", "--original", action="store_true",
        help="Revert binaries to original names (remove architecture suffix)"
    )

    args = parser.parse_args()

    if args.original:
        revert_binaries()
    else:
        binaries = rename_binaries()
        write_tauri_config(binaries)
        update_capabilities(binaries)
