namespace ZDThermoliner.ErpLauncher;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        try
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
            Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
            Application.Run(new ErpMainForm());
        }
        catch (Exception ex)
        {
            DesktopInstaller.Log($"Fatal: {ex}");
            MessageBox.Show(
                $"Impossible de demarrer Z&D Thermoliner ERP.\n\n{ex.Message}",
                ErpMainForm.WindowTitle,
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }
}
