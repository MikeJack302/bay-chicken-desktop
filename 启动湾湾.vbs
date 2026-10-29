Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = root
exe = root & "\release\BayChicken\electron.exe"
If fso.FileExists(exe) Then
  shell.Run """" & exe & """", 1, False
Else
  exe = root & "\node_modules\electron\dist\electron.exe"
  If fso.FileExists(exe) And fso.FileExists(root & "\dist\pet.js") Then
    shell.Run """" & exe & """ """ & root & """", 1, False
  Else
    MsgBox "Please build the app first. See README.md.", 64, "Bay Chicken"
  End If
End If
