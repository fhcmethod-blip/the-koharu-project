' Launch Koharu site with no console window (for Startup folder / Task Scheduler)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\Rob_k\OneDrive\Desktop\kohar"
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""C:\Users\Rob_k\OneDrive\Desktop\kohar\start-site.ps1""", 0, False
