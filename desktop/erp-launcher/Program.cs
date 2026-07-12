namespace ZDThermoliner.ErpLauncher;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        if (DesktopInstaller.SyncAndRelaunchIfNeeded())
        {
            return;
        }

        using var mutex = new Mutex(true, LauncherConfig.MutexName, out var createdNew);
        if (!createdNew)
        {
            NativeMethods.FocusExistingWindow();
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new ErpMainForm());
    }
}
