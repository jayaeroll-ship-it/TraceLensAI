$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path '.venv/Scripts/python.exe') -or !(Test-Path 'frontend/node_modules/vite/bin/vite.js')) {
    throw 'Install dependencies first using README.md.'
}
$backend = Start-Process -FilePath "$PSScriptRoot/.venv/Scripts/python.exe" -ArgumentList '-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','8000' -WindowStyle Hidden -PassThru -RedirectStandardOutput backend/server.log -RedirectStandardError backend/server-error.log
Write-Host 'TraceLens AI: http://127.0.0.1:5173 (Ctrl+C stops the app)'
try {
    & node frontend/node_modules/vite/bin/vite.js frontend --host 127.0.0.1 --strictPort
} finally {
    if (!$backend.HasExited) { Stop-Process -Id $backend.Id }
}
