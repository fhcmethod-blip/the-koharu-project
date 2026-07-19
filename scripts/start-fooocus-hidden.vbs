' Launch Fooocus watchdog with no console window (Task Scheduler)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\Rob_k\OneDrive\Desktop\kohar\scripts"
sh.Run "cmd.exe /c ""C:\Users\Rob_k\OneDrive\Desktop\kohar\scripts\start-fooocus.bat""", 0, False
