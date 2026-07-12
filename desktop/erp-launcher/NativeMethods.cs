using System.Runtime.InteropServices;

namespace ZDThermoliner.ErpLauncher;

internal static class NativeMethods
{
    public const int SwRestore = 9;

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr FindWindow(string? lpClassName, string? lpWindowName);

    public static void FocusExistingWindow()
    {
        var handle = FindWindow(null, ErpMainForm.WindowTitle);
        if (handle == IntPtr.Zero) return;
        ShowWindow(handle, SwRestore);
        SetForegroundWindow(handle);
    }
}
