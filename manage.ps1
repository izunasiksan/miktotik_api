param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$env,

    [Parameter(Mandatory=$true)]
    [ValidateSet("up", "down", "logs")]
    [string]$action
)

$deployPath = "deploy\$env"
$composeFile = "$deployPath\docker-compose.yml"
$baseCompose = "docker-compose.yml"

if (-not (Test-Path $deployPath)) {
    Write-Error "Environment '$env' not found in deploy\"
    exit 1
}

Write-Host "🚀 Managing Environment: $env ($action)" -ForegroundColor Cyan

switch ($action) {
    "up" {
        docker-compose -f $baseCompose -f $composeFile up -d --build
    }
    "down" {
        docker-compose -f $baseCompose -f $composeFile down
    }
    "logs" {
        docker-compose -f $baseCompose -f $composeFile logs -f
    }
}
