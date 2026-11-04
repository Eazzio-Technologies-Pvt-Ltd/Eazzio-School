# Baseline Verification Report (`BASELINE_VERIFICATION.md`)

## 1. Verification Date & Environment
- **Date**: October 10, 2026
- **Working Directory**: `mobile/`
- **Flutter / Dart SDK**: Verified installed and functional
- **Java Runtime**: OpenJDK 21 (`/usr/lib/jvm/java-1.21.0-openjdk-amd64`)
- **Filesystem Integrity**: Zero modifications outside `mobile/` (`git status --short` confirms strict confinement)

---

## 2. Command Execution Record & Results

| Check / Verification Command | Exit Code | Observed Output / Evidence | Status |
|---|---|---|---|
| `dart format --output=none --set-exit-if-changed .` | `0` | Formatted 31 files (0 changed) in 0.36s | **Verified Clean** |
| `flutter analyze` | `0` | `No issues found! (ran in 4.1s)` | **Verified Clean** |
| `flutter test --reporter expanded` | `0` | 11/11 tests passed in expanded mode | **Verified 100% Passing** |
| `flutter build apk --release` | `0` | Built `mobile/build/app/outputs/flutter-apk/app-release.apk` (69.5MB) in 59.0s | **Fresh Release Build Verified** |

---

## 3. Fresh Release Build Artifact Details
- **Path**: `mobile/build/app/outputs/flutter-apk/app-release.apk`
- **File Size**: 69.5 MB
- **Compilation Toolchain**: Gradle `assembleRelease` with OpenJDK 21
- **Package Inclusions**: Unified application package containing both Student Portal and Teacher Portal
