<#
.SYNOPSIS
    Install / uninstall helper and printed runbook for dsh-workspace-sections-official.

.DESCRIPTION
    DEFAULT IS DRY RUN: every command is printed and nothing is changed.
    Pass -Execute to actually run the install/uninstall/build command.

    Installation touches %USERPROFILE%\.dsh\profiles\<profile> (a dependency and
    the dsh.profile.bundles selection), so fully quit DeepSeek Harness Desktop
    before running the CLI form. The package IS installed in the `desktop` profile
    (2026-10-22) as a live `link:` bundle via the plugin_manager agent tool; the
    CLI form below is the offline fallback and is NOT run by default.

    What the CLI does (verified against DSH 0.2.1-rc.2 source, not executed here):
      * 'dsh plugin --help' forwards the remaining arguments to pnpm inside the
        profile directory (dsh/lib/bin.js -> runPlugin).
      * A package that declares dsh.bundle is appended to dsh.profile.bundles by
        the plugin-manager reconcile step after a successful 'add', and removed
        again by 'remove' (dsh-plugin-manager/lib/types/operations.js).
      * Enable/disable is bundle selection, not an npm operation: use the
        plugin_manager agent tool (set_bundle), the Plugins page in the app, or
        a profile-layer override in the profile's cordis.patch.yml.

.EXAMPLE
    .\install.ps1
    # prints current state and the exact commands

.EXAMPLE
    .\install.ps1 -Action install -Execute
    # actually link the package into the desktop profile (Desktop must be quit)
#>
[CmdletBinding()]
param(
    [ValidateSet("status", "install", "uninstall", "build")]
    [string]$Action = "status",
    [string]$Profile = "desktop",
    [string]$PackagePath = "",
    [switch]$Execute
)

$ErrorActionPreference = "Stop"

$DshCli = if ($env:DSH_CLI) { $env:DSH_CLI } else { "dsh" }
$Node = if ($env:DSH_NODE) { $env:DSH_NODE } else { "node" }
$PackageName = "dsh-workspace-sections-official"
if ($PackagePath -eq "") {
    $PackagePath = Split-Path -Parent $PSScriptRoot
}
$ProfileDir = Join-Path $env:USERPROFILE (Join-Path ".dsh\profiles" $Profile)
$ProfileManifest = Join-Path $ProfileDir "package.json"

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host ("== " + $Title)
}

function Show-Status {
    Write-Section "profile"
    Write-Host ("  profile dir: " + $ProfileDir)
    if (Test-Path $ProfileManifest) {
        $manifest = Get-Content -Raw $ProfileManifest | ConvertFrom-Json
        $dependency = $null
        if ($null -ne $manifest.dependencies) {
            $dependency = $manifest.dependencies.PSObject.Properties[$PackageName]
        }
        if ($null -eq $dependency) {
            Write-Host "  dependency:        (not installed)"
        } else {
            Write-Host ("  dependency:        " + $dependency.Value)
        }
        $bundles = @()
        if ($null -ne $manifest.dsh -and $null -ne $manifest.dsh.profile -and $null -ne $manifest.dsh.profile.bundles) {
            $bundles = @($manifest.dsh.profile.bundles)
        }
        if ($bundles -contains $PackageName) {
            Write-Host "  profile layer:     selected (dsh.profile.bundles)"
        } else {
            Write-Host "  profile layer:     not selected"
        }
        $oldDependency = $null
        if ($null -ne $manifest.dependencies) {
            $oldDependency = $manifest.dependencies.PSObject.Properties["dsh-workspace-sections"]
        }
        if ($null -eq $oldDependency) {
            Write-Host "  old shadow plugin: not a dependency"
        } else {
            if ($bundles -contains "dsh-workspace-sections") {
                Write-Host "  old shadow plugin: dependency + selected layer - DISABLE OR REMOVE BEFORE INSTALLING (same priority:-100 slot)"
            } else {
                Write-Host ("  old shadow plugin: dependency only (" + $oldDependency.Value + "), NOT selected as a layer - dormant")
            }
        }
    } else {
        Write-Host "  profile manifest not found (open Desktop once to initialise the profile)."
    }

    Write-Section "package"
    Write-Host ("  path:      " + $PackagePath)
    Write-Host ("  name:      " + $PackageName)
    $entry = Join-Path $PackagePath "lib\client.js"
    if (Test-Path $entry) {
        Write-Host "  client.js: present (generated)"
    } else {
        Write-Host "  client.js: MISSING - run the build first (Action build)"
    }
    $patchDir = Join-Path $PackagePath "patches"
    if (Test-Path $patchDir) {
        $patchFiles = @(Get-ChildItem -Path $patchDir -Filter "*.mjs" -Name | Sort-Object)
        Write-Host ("  patches:   " + ($patchFiles -join ", "))
    }

    Write-Section "next steps"
    Write-Host "  install:   .\install.ps1 -Action install -Execute"
    Write-Host "  enable:    plugin_manager {action:'set_bundle', target:'$PackageName', enabled:true}"
    Write-Host "  disable:   plugin_manager {action:'set_bundle', target:'$PackageName', enabled:false}"
    Write-Host "  uninstall: .\install.ps1 -Action uninstall -Execute"
}

function Invoke-Install {
    Write-Section "install"
    Write-Host "  preconditions:"
    Write-Host "    - DeepSeek Harness Desktop must be fully quit (profile lock)."
    Write-Host "    - old shadow plugin dsh-workspace-sections must not be a selected layer."
    Write-Host "  command:"
    Write-Host ("    & '" + $DshCli + "' plugin --profile " + $Profile + " add '" + $PackagePath + "'")
    Write-Host "  effect: pnpm links the local directory into the profile; because package.json"
    Write-Host "          declares dsh.bundle, the plugin manager appends"
    Write-Host ("          " + $PackageName + " to dsh.profile.bundles.")
    Write-Host "  note:  the bundle patch disables the shipped ui-workspace row while this"
    Write-Host "         bundle is selected (it replaces the browser instead of shadowing it)."
    Write-Host "         Disabling this bundle re-enables the shipped row."
    if (-not $Execute) {
        Write-Host ""
        Write-Host "  [dry-run] nothing was executed; pass -Execute to run the command."
        return
    }
    & $DshCli plugin --profile $Profile add $PackagePath
    if ($LASTEXITCODE -ne 0) { throw ("dsh plugin add failed with exit code " + $LASTEXITCODE) }
    Write-Host "  installed. Refresh the page (client half) and check the Plugins page."
}

function Invoke-Uninstall {
    Write-Section "uninstall"
    Write-Host "  preconditions:"
    Write-Host "    - DeepSeek Harness Desktop must be fully quit (profile lock)."
    Write-Host "  command:"
    Write-Host ("    & '" + $DshCli + "' plugin --profile " + $Profile + " remove " + $PackageName)
    Write-Host "  effect: removes the dependency and drops the package from dsh.profile.bundles."
    if (-not $Execute) {
        Write-Host ""
        Write-Host "  [dry-run] nothing was executed; pass -Execute to run the command."
        return
    }
    & $DshCli plugin --profile $Profile remove $PackageName
    if ($LASTEXITCODE -ne 0) { throw ("dsh plugin remove failed with exit code " + $LASTEXITCODE) }
    Write-Host "  uninstalled."
}

function Invoke-Build {
    Write-Section "build"
    $buildScript = Join-Path $PackagePath "scripts\build-client.mjs"
    Write-Host ("  command: & '" + $Node + "' '" + $buildScript + "'")
    Write-Host "  note:    a partial build requires BUILD_ALLOW_MISSING=1 and must not be installed."
    if (-not $Execute) {
        Write-Host ""
        Write-Host "  [dry-run] nothing was executed; pass -Execute to run the build."
        return
    }
    & $Node $buildScript
    if ($LASTEXITCODE -ne 0) { throw ("build failed with exit code " + $LASTEXITCODE) }
}

switch ($Action) {
    "status"    { Show-Status }
    "install"   { Invoke-Install }
    "uninstall" { Invoke-Uninstall }
    "build"     { Invoke-Build }
}
