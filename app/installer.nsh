; Adds "Fill in with WonderBoy" to the right-click menu of every folder (for this user only).
; Directory\Background = right-click on empty space inside a folder (%V = that folder).
; Directory            = right-click on a folder itself (%1 = that folder).
; On Windows 11 the item is under "Show more options".

!macro customInstall
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\WonderBoy" "" "Fill in with WonderBoy"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\WonderBoy" "Icon" "$INSTDIR\WonderBoy.exe"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\WonderBoy\command" "" '"$INSTDIR\WonderBoy.exe" "%V"'

  WriteRegStr HKCU "Software\Classes\Directory\shell\WonderBoy" "" "Fill in with WonderBoy"
  WriteRegStr HKCU "Software\Classes\Directory\shell\WonderBoy" "Icon" "$INSTDIR\WonderBoy.exe"
  WriteRegStr HKCU "Software\Classes\Directory\shell\WonderBoy\command" "" '"$INSTDIR\WonderBoy.exe" "%1"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\WonderBoy"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\WonderBoy"
!macroend
