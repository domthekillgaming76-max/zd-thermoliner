using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace ZDThermoliner.ErpLauncher;

internal sealed class ErpMainForm : Form
{
    public const string WindowTitle = "Z&D Thermoliner ERP";

    private readonly WebView2 _webView = new() { Dock = DockStyle.Fill };
    private readonly string _erpUrl;
    private readonly System.Windows.Forms.Timer _retryTimer = new() { Interval = 5000 };
    private bool _navigationInProgress;

    public ErpMainForm()
    {
        _erpUrl = ResolveErpUrl();

        Text = WindowTitle;
        MinimumSize = new Size(1024, 640);
        Size = new Size(1440, 900);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(8, 8, 8);

        try
        {
            var exePath = File.Exists(DesktopInstaller.InstalledExePath)
                ? DesktopInstaller.InstalledExePath
                : Environment.ProcessPath ?? Application.ExecutablePath;
            if (!string.IsNullOrWhiteSpace(exePath))
            {
                Icon = Icon.ExtractAssociatedIcon(exePath);
            }
        }
        catch
        {
            /* icone par defaut */
        }

        Controls.Add(_webView);
        _retryTimer.Tick += RetryNavigation;
        Load += OnFormLoadAsync;
        FormClosing += OnFormClosing;
    }

    private static string ResolveErpUrl()
    {
        var args = Environment.GetCommandLineArgs();
        for (var i = 1; i < args.Length - 1; i++)
        {
            if (args[i] is "--url" or "-u" && Uri.TryCreate(args[i + 1], UriKind.Absolute, out var uri))
            {
                return uri.ToString();
            }
        }

        return LauncherConfig.DefaultErpUrl;
    }

    private async void OnFormLoadAsync(object? sender, EventArgs e)
    {
        Load -= OnFormLoadAsync;
        try
        {
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                LauncherConfig.UserDataFolderName,
                "WebView2");

            Directory.CreateDirectory(userData);

            var env = await CoreWebView2Environment.CreateAsync(
                browserExecutableFolder: null,
                userDataFolder: userData);

            await _webView.EnsureCoreWebView2Async(env);

            var settings = _webView.CoreWebView2.Settings;
            settings.UserAgent = $"{settings.UserAgent} ZDThermolinerErpLauncher/{DesktopInstaller.CurrentVersion}";
            settings.AreDefaultContextMenusEnabled = true;
            settings.AreDevToolsEnabled = false;
            settings.IsStatusBarEnabled = false;
            settings.IsZoomControlEnabled = false;

            _webView.CoreWebView2.NavigationStarting += (_, _) =>
            {
                _navigationInProgress = true;
                Text = $"{WindowTitle} — connexion…";
            };

            _webView.CoreWebView2.NavigationCompleted += (_, args) =>
            {
                _navigationInProgress = false;
                if (args.IsSuccess)
                {
                    _retryTimer.Stop();
                    Text = WindowTitle;
                }
                else
                {
                    Text = $"{WindowTitle} — reconnexion automatique…";
                    _retryTimer.Start();
                    DesktopInstaller.Log($"Navigation échouée : {args.WebErrorStatus}");
                }
            };

            _webView.CoreWebView2.Navigate(_erpUrl);
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"Impossible de démarrer WebView2.\n\n{ex.Message}\n\nInstallez le runtime WebView2 Microsoft.",
                WindowTitle,
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
    }

    private void RetryNavigation(object? sender, EventArgs e)
    {
        if (_navigationInProgress || _webView.CoreWebView2 is null)
        {
            return;
        }

        try
        {
            _webView.CoreWebView2.Navigate(_erpUrl);
        }
        catch (Exception ex)
        {
            DesktopInstaller.Log($"Reconnexion impossible : {ex.Message}");
        }
    }

    private void OnFormClosing(object? sender, FormClosingEventArgs e)
    {
        _retryTimer.Stop();
        _retryTimer.Dispose();
        _webView.Dispose();
    }
}
