#!/usr/bin/env python3
"""
Patch the Expo-generated iOS Podfile for Xcode 16.4 CI compatibility.

Must be run after `npm run prebuild:ios` has generated the Podfile, and
before `pod install`.  Run from the repository root.

Inserts a Ruby post_install block after `react_native_post_install` that:
  - Pins ExpoModulesCore to Swift 5.10
  - Adds -strict-concurrency=minimal to all targets
  - Ensures IPHONEOS_DEPLOYMENT_TARGET >= 12.0
  - Silences deprecation warnings
"""
import sys


def patch():
    path = "apps/mobile/ios/Podfile"

    with open(path) as f:
        src = f.read()

    # Find react_native_post_install( and use paren-counting to locate the
    # matching closing ')'.  This handles nested calls like
    # ccache_enabled?(podfile_properties) that break simple regex approaches.
    marker = "react_native_post_install("
    idx = src.find(marker)
    if idx == -1:
        print("ERROR: could not find react_native_post_install in Podfile", file=sys.stderr)
        sys.exit(1)

    paren_start = idx + len(marker) - 1   # index of the opening '('
    depth = 0
    close_idx = -1
    for i in range(paren_start, len(src)):
        if src[i] == "(":
            depth += 1
        elif src[i] == ")":
            depth -= 1
            if depth == 0:
                close_idx = i
                break

    if close_idx == -1:
        print("ERROR: unbalanced parens after react_native_post_install", file=sys.stderr)
        sys.exit(1)

    eol = src.index("\n", close_idx)

    patch_block = (
        "\n"
        "    # -- CI patches (must run after react_native_post_install) --\n"
        "    installer.pods_project.targets.each do |target|\n"
        "      target.build_configurations.each do |config|\n"
        '        if target.name == "ExpoModulesCore"\n'
        '          config.build_settings["SWIFT_VERSION"] = "5.10"\n'
        '        end\n'
        '        flags = config.build_settings["OTHER_SWIFT_FLAGS"] || "$(inherited)"\n'
        '        unless flags.include?("-strict-concurrency")\n'
        '          config.build_settings["OTHER_SWIFT_FLAGS"] = flags + " -strict-concurrency=minimal"\n'
        '        end\n'
        '        dt = config.build_settings["IPHONEOS_DEPLOYMENT_TARGET"].to_f\n'
        '        config.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "12.0" if dt < 12.0\n'
        '        config.build_settings["GCC_WARN_ABOUT_DEPRECATED_FUNCTIONS"] = "NO"\n'
        "      end\n"
        "    end\n"
        "    # -- end CI patches --\n"
    )

    patched = src[: eol + 1] + patch_block + src[eol + 1 :]

    with open(path, "w") as f:
        f.write(patched)

    print("Podfile patched successfully")


if __name__ == "__main__":
    patch()
