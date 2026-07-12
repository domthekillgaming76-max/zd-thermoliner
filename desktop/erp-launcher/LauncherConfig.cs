namespace ZDThermoliner.ErpLauncher;

internal static class LauncherConfig
{
    public const string MutexName = "ZDThermoliner.ERP.Launcher.SingleInstance";
    public const string DefaultErpUrl = "https://erp.zd-thermoliner.fr";
    public const string UserDataFolderName = "ZDThermolinerERP";
    public const string InstallFolderName = "ZD-Thermoliner-ERP";
    public const string ReadyArgument = "--zd-ready";
}
