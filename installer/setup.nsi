Unicode True
!include "MUI2.nsh"
!include "LogicLib.nsh"
Name "AE Tools 1.0"
OutFile "..\build\AE-Tools-1.0-Setup.exe"
RequestExecutionLevel user
ManifestDPIAware true
SetCompressor /SOLID lzma
ShowInstDetails show
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

; Payload is an immutable, verified, signed CEP tree. Staging and backup are
; outside Adobe's extension scan directory on the same roaming-profile volume.
Section "Install"
  InitPluginsDir
  SetShellVarContext current
  StrCpy $0 "$APPDATA\Adobe\CEP\extensions\com.nasaat.aetools.panel"
  StrCpy $1 "$APPDATA\Nasaat\AE Tools\install-work"
  CreateDirectory "$APPDATA\Nasaat\AE Tools"
  System::Call 'kernel32::CreateMutexW(p 0,i 0,w "Local\Nasaat.AETools.Install")p.r4 ?e'
  Pop $5
  ${If} $5 = 183
    Abort "Another AE Tools installer is running."
  ${EndIf}
  ; Refuse an unrecognized target or interrupted update; never overwrite it.
  IfFileExists "$1\previous\*.*" 0 +2
    Abort "A previous installation is backed up in install-work. Restore it or move it aside before retrying."
  IfFileExists "$1\staged\*.*" 0 +2
    Abort "A previous staging folder exists in install-work. Inspect it before retrying."
  IfFileExists "$0\*.*" 0 recognized
  IfFileExists "$0\aetools-install.id" recognized
    Abort "The destination exists without the AE Tools ownership marker."
  recognized:
  ClearErrors
  SetOutPath "$1\staged"
  File /r "..\build\signed\*"
  IfErrors broken
  CreateDirectory "$APPDATA\Adobe\CEP\extensions"
  SetOutPath "$TEMP"
  IfFileExists "$0\*.*" 0 install
  ClearErrors
  Rename "$0" "$1\previous"
  IfErrors locked
  install:
  ClearErrors
  Rename "$1\staged" "$0"
  IfErrors restore
  RMDir /r "$1\previous"
  RMDir "$1"
  DetailPrint "AE Tools installed. Restart After Effects, then open Window > Extensions > AE Tools."
  Goto done
  restore:
  IfFileExists "$1\previous\*.*" 0 broken
  Rename "$1\previous" "$0"
  broken:
  RMDir /r "$1\staged"
  Abort "AE Tools could not be installed. Inspect the destination and install-work folder before retrying."
  locked:
  RMDir /r "$1\staged"
  Abort "Close After Effects and retry. The installed panel could not be moved."
  done:
SectionEnd
