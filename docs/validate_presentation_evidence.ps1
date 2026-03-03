$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$evidenceDir = Join-Path $PSScriptRoot "presentation_evidence\screenshots"

$required = @(
  "01-login-tenant-context.png",
  "02-dashboard-role-routing.png",
  "03-academics-structure-backbone.png",
  "04-student-lifecycle-linkage.png",
  "05-teacher-finance-denied.png",
  "06-accountant-academics-denied.png",
  "07-invoice-immutability.png",
  "08-closed-period-mutation-denied.png",
  "09-parent-child-scope.png",
  "10-test-evidence-summary.png"
)

if (-not (Test-Path $evidenceDir)) {
  New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
}

$missing = @()
foreach ($name in $required) {
  $path = Join-Path $evidenceDir $name
  if (-not (Test-Path $path)) {
    $missing += $name
  }
}

Write-Host ""
Write-Host "Presentation Evidence Validation"
Write-Host "Directory: $evidenceDir"
Write-Host "Required files: $($required.Count)"
Write-Host "Missing files: $($missing.Count)"

if ($missing.Count -eq 0) {
  Write-Host "STATUS: PASS"
  exit 0
}

Write-Host "STATUS: FAIL"
Write-Host "Missing list:"
$missing | ForEach-Object { Write-Host " - $_" }
exit 1
