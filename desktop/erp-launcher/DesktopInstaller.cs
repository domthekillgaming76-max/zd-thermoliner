using System.Diagnostics;
using System.Reflection;

namespace ZDThermoliner.ErpLauncher;

internal static class DesktopInstaller
{
    public const string ShortcutFileName = "Z&D Thermoliner ERP.lnk";
    private const string EmbeddedAssetsPrefix = "ZDThermoliner.ErpLauncher.assets.";

    public static string InstallDirectory { get; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Programs",
        LauncherConfig.InstallFolderName);

    public static string InstalledExePath { get; } = Path.Combine(InstallDirectory, "ZD-Thermoliner-ERP.exe");

    public static string InstalledIconPath { get; } = Path.Combine(InstallDirectory, "assets", "desktop-shortcut.ico");

    public static string CurrentVersion { get; } =
        Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "1.0.0";

    public static bool SyncAndRelaunchIfNeeded()
    {
        var sourceExe = Environment.ProcessPath ?? Application.ExecutablePath;
        if (string.IsNullOrWhiteSpace(sourceExe) || !File.Exists(sourceExe))
        {
            return false;
        }

        Directory.CreateDirectory(InstallDirectory);
        Directory.CreateDirectory(Path.Combine(InstallDirectory, "assets"));

        CopyAssets(Path.GetDirectoryName(sourceExe) ?? AppContext.BaseDirectory);
        InstallExecutable(sourceExe);
        WriteVersionMarker();
        EnsureDesktopShortcut();

        if (!PathsEqual(sourceExe, InstalledExePath))
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = InstalledExePath,
                UseShellExecute = true,
                WorkingDirectory = InstallDirectory,
            });
            return true;
        }

        return false;
    }

    private static void InstallExecutable(string sourceExe)
    {
        var shouldCopy = !File.Exists(InstalledExePath);
        if (!shouldCopy)
        {
            var sourceTime = File.GetLastWriteTimeUtc(sourceExe);
            var installedTime = File.GetLastWriteTimeUtc(InstalledExePath);
            shouldCopy = sourceTime > installedTime;
        }

        if (shouldCopy)
        {
            File.Copy(sourceExe, InstalledExePath, overwrite: true);
        }
    }

    private static void CopyAssets(string baseDirectory)
    {
        var targetAssets = Path.Combine(InstallDirectory, "assets");
        Directory.CreateDirectory(targetAssets);
        ExtractEmbeddedAssetsTo(targetAssets);

        var sourceAssets = Path.Combine(baseDirectory, "assets");
        if (!Directory.Exists(sourceAssets))
        {
            return;
        }

        foreach (var file in Directory.GetFiles(sourceAssets))
        {
            var name = Path.GetFileName(file);
            var target = Path.Combine(targetAssets, name);
            File.Copy(file, target, overwrite: true);
        }
    }

    private static void ExtractEmbeddedAssetsTo(string targetAssets)
    {
        var assembly = Assembly.GetExecutingAssembly();
        foreach (var resourceName in assembly.GetManifestResourceNames())
        {
            if (!resourceName.StartsWith(EmbeddedAssetsPrefix, StringComparison.Ordinal))
            {
                continue;
            }

            var fileName = resourceName[EmbeddedAssetsPrefix.Length..];
            if (string.IsNullOrWhiteSpace(fileName))
            {
                continue;
            }

            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream is null)
            {
                continue;
            }

            var target = Path.Combine(targetAssets, fileName);
            using var file = File.Open(target, FileMode.Create, FileAccess.Write);
            stream.CopyTo(file);
        }
    }

    private static void WriteVersionMarker()
    {
        var versionFile = Path.Combine(InstallDirectory, "version.txt");
        File.WriteAllText(versionFile, CurrentVersion);
    }

    private static void EnsureDesktopShortcut()
    {
        var desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        var shortcutPath = Path.Combine(desktop, ShortcutFileName);
        var iconPath = File.Exists(InstalledIconPath)
            ? InstalledIconPath
            : Path.Combine(InstallDirectory, "assets", "desktop-shortcut.ico");

        var shellType = Type.GetTypeFromProgID("WScript.Shell");
        if (shellType is null)
        {
            return;
        }

        dynamic shell = Activator.CreateInstance(shellType)!;
        dynamic shortcut = shell.CreateShortcut(shortcutPath);
        shortcut.TargetPath = InstalledExePath;
        shortcut.WorkingDirectory = InstallDirectory;
        shortcut.WindowStyle = 1;
        shortcut.Description = "Z and D Thermoliner ERP";
        if (File.Exists(iconPath))
        {
            shortcut.IconLocation = $"{iconPath},0";
        }
        shortcut.Save();
    }

    private static bool PathsEqual(string a, string b)
    {
        return string.Equals(
            Path.GetFullPath(a).TrimEnd('\\'),
            Path.GetFullPath(b).TrimEnd('\\'),
            StringComparison.OrdinalIgnoreCase);
    }
}
