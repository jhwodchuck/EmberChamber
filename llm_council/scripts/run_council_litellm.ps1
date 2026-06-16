[CmdletBinding()]
param(
    [ValidateSet("codex", "claude", "gemini", "copilot")]
    [string]$Cli = "copilot",
    [string]$BaseRef = "main",
    [string]$HeadRef = "HEAD",
    [string]$ReviewTarget = "manual-review"
)

# 1. Source the LiteLLM Profile to get wrapper functions
$liteLLMProfile = "C:\gh\LocalPC\LiteLLM\scripts\LiteLLM-Profile.ps1"
if (Test-Path $liteLLMProfile) {
    . $liteLLMProfile
} else {
    Write-Error "LiteLLM Profile script not found at $liteLLMProfile"
    return
}

# 2. Gather evidence pack using the project's orchestration script
Write-Host "--- Gathering evidence pack ---" -ForegroundColor Cyan
npm run council:review -- $BaseRef $HeadRef $ReviewTarget

if (-not (Test-Path "evidence-pack.md") -or -not (Test-Path "recommended-reviewers.txt")) {
    Write-Error "Failed to generate evidence pack or recommended reviewers list."
    return
}

# 3. Read recommended reviewers
$reviewers = Get-Content "recommended-reviewers.txt" | Where-Object { $_ -match "^C-\d+" } | ForEach-Object {
    if ($_ -match "^(C-\d+)") { $Matches[1] }
}

if ($reviewers.Count -eq 0) {
    Write-Host "No recommended reviewers found in recommended-reviewers.txt." -ForegroundColor Yellow
    return
}

Write-Host "Recommended reviewers: $($reviewers -join ', ')" -ForegroundColor Green

# 4. Helper function to compile prompt for a persona
function Get-CouncilPrompt {
    param([string]$PersonaId)
    
    $sb = [System.Text.StringBuilder]::new()
    
    # Append Persona Prompt
    $personaFile = Get-ChildItem "llm_council/personas" | Where-Object { $_.Name -like "$PersonaId-*" } | Select-Object -First 1
    if ($personaFile) {
        $sb.AppendLine("=== PERSONA INSTRUCTIONS ===")
        $sb.AppendLine((Get-Content $personaFile.FullName -Raw))
    }
    
    # Append Shared Rules
    $sb.AppendLine("=== SHARED RULES ===")
    Get-ChildItem "llm_council/shared/*.md" | ForEach-Object {
        $sb.AppendLine("--- File: $($_.Name) ---")
        $sb.AppendLine((Get-Content $_.FullName -Raw))
    }
    
    # Append Evidence Pack
    $sb.AppendLine("=== EVIDENCE PACK ===")
    $sb.AppendLine((Get-Content "evidence-pack.md" -Raw))
    
    return $sb.ToString()
}

# 5. Run each reviewer
$reports = @()
foreach ($reviewer in $reviewers) {
    Write-Host "--- Running reviewer $reviewer using $Cli ---" -ForegroundColor Cyan
    $prompt = Get-CouncilPrompt -PersonaId $reviewer
    $reportFile = "report-$reviewer.md"
    
    switch ($Cli) {
        "codex" {
            # Run codex exec non-interactively, write stdout directly to file
            $prompt | codex-litellm exec -s read-only -a never --ephemeral -o $reportFile
        }
        "claude" {
            # Run claude -p non-interactively with tools disabled
            $prompt | claude-litellm -p --tools "" --no-session-persistence > $reportFile
        }
        "gemini" {
            # Run gemini -p non-interactively in read-only plan mode
            $prompt | gemini-litellm -p - --approval-mode plan > $reportFile
        }
        "copilot" {
            # Run copilot -p non-interactively and silent with yolo/allow-all-tools
            $prompt | copilot-litellm -p - -s --no-ask-user --allow-all-tools > $reportFile
        }
    }
    
    if (Test-Path $reportFile) {
        Write-Host "Report saved to $reportFile" -ForegroundColor Green
        $reports += $reportFile
    } else {
        Write-Error "Failed to generate report for $reviewer"
    }
}

# 6. Run Moderator Synthesis
Write-Host "--- Running Moderator C-00 for final synthesis ---" -ForegroundColor Cyan
$moderatorPrompt = [System.Text.StringBuilder]::new()
$moderatorPersona = Get-ChildItem "llm_council/personas" | Where-Object { $_.Name -like "C-00-*" } | Select-Object -First 1
if ($moderatorPersona) {
    $moderatorPrompt.AppendLine("=== MODERATOR INSTRUCTIONS ===")
    $moderatorPrompt.AppendLine((Get-Content $moderatorPersona.FullName -Raw))
}

$moderatorPrompt.AppendLine("=== SHARED RULES ===")
Get-ChildItem "llm_council/shared/*.md" | ForEach-Object {
    $moderatorPrompt.AppendLine("--- File: $($_.Name) ---")
    $moderatorPrompt.AppendLine((Get-Content $_.FullName -Raw))
}

$moderatorPrompt.AppendLine("=== EVIDENCE PACK ===")
$moderatorPrompt.AppendLine((Get-Content "evidence-pack.md" -Raw))

$moderatorPrompt.AppendLine("=== INDIVIDUAL SPECIALIST REPORTS ===")
foreach ($report in $reports) {
    $moderatorPrompt.AppendLine("--- Report from $(Split-Path $report -Leaf) ---")
    $moderatorPrompt.AppendLine((Get-Content $report -Raw))
}

$synthesisReport = "synthesis-decision-report.md"
switch ($Cli) {
    "codex" {
        $moderatorPrompt.ToString() | codex-litellm exec -s read-only -a never --ephemeral -o $synthesisReport
    }
    "claude" {
        $moderatorPrompt.ToString() | claude-litellm -p --tools "" --no-session-persistence > $synthesisReport
    }
    "gemini" {
        $moderatorPrompt.ToString() | gemini-litellm -p - --approval-mode plan > $synthesisReport
    }
    "copilot" {
        $moderatorPrompt.ToString() | copilot-litellm -p - -s --no-ask-user --allow-all-tools > $synthesisReport
    }
}

if (Test-Path $synthesisReport) {
    Write-Host "Final Synthesis Report saved to $synthesisReport" -ForegroundColor Green
} else {
    Write-Error "Failed to generate final synthesis report."
}
