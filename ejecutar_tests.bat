@echo off
cd /d "%~dp0"
title Skill Blast X - Suite de Tests de Desarrollo
color 0A
node tests/suite_runner.js
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Algunas pruebas fallaron. Revisa el registro arriba.
) else (
    echo [EXITO] Todas las pruebas pasaron satisfactoriamente.
)
pause
