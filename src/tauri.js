const { fs, invoke, shell, app, dialog, process, globalShortcut } = __TAURI__;

// state file
const APP_STATE_ROOT = fs.BaseDirectory.AppData;
const APP_STATE_FILE = 'app_state.json';
const APP_SELECTOR = '.Hotlist';

// get current window and hide by default
const currentWindow = __TAURI__.window.getCurrent();

// hide window by default
currentWindow.hide();

// is same array?
const arrayEqual = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

export const getAppVersion = () => app.getVersion();

export const showDialog = async (msg, options) => {
    return dialog.message(msg, { ...options, title: 'Hotlist' });
};

export const showConfirm = async (msg) => {
    return dialog.ask(msg, { title: 'Hotlist' });
};

const createPosition = (x, y) =>
    new __TAURI__.window.PhysicalPosition(x * window.devicePixelRatio, y * window.devicePixelRatio);

export const createSize = (width, height) =>
    new __TAURI__.window.PhysicalSize(
        width * window.devicePixelRatio,
        height * window.devicePixelRatio
    );

export const quit = () => process.exit(1);

export const readState = async () => {
    const str = await readFile(APP_STATE_FILE);
    return str && str.length ? JSON.parse(str) : {};
};

export const writeState = async (state) => {
    if (!state) return;
    const str = JSON.stringify(state);
    return await writeFile(APP_STATE_FILE, str);
};

export const readFile = async (file) => {
    const { exists, readTextFile } = fs;

    try {
        const fileExists = await exists(file, {
            dir: APP_STATE_ROOT,
        });
        if (!fileExists) return;
    } catch (err) {
        console.error('Exists error', err);
        return;
    }

    try {
        return await readTextFile(file, { dir: APP_STATE_ROOT });
    } catch (err) {
        console.error('Read file error', err);
    }
};

export const writeFile = async (file, contents) => {
    const { createDir, writeTextFile } = fs;
    try {
        // need this to create APP_STATE dir to hold state (otherwise app support dir is not created)
        await createDir('tmp', { dir: APP_STATE_ROOT, recursive: true });

        // write the text file
        await writeTextFile({ contents, path: file }, { dir: APP_STATE_ROOT });
    } catch (err) {
        console.error('Write file error', err);
    }
};

export const setWindowSize = (width, height) => currentWindow.setSize(createSize(width, height));

export const setWindowPosition = (x, y) => currentWindow.setPosition(createPosition(x, y));

export const getWindowSize = async () => {
    const size = await currentWindow.outerSize();
    return {
        width: Math.ceil(size.width / window.devicePixelRatio),
        height: Math.ceil(size.width / window.devicePixelRatio),
    };
};

let hasFocus = false;
currentWindow.onFocusChanged(({ payload: focused }) => {
    hasFocus = focused;
});

export const windowHasFocus = () => hasFocus;

export const hideWindow = () => currentWindow.hide();

export const showWindow = () => currentWindow.show();

export const isWindowVisible = () => currentWindow.isVisible();

export const focusWindow = () => currentWindow.setFocus();

export const openURL = (url) => shell.open(url);

export const setSystemTrayIcon = (icon) => invoke('set_system_tray_icon', { icon });

export const setSystemTrayTooltip = (tooltip) => invoke('set_system_tray_tooltip', { tooltip });

let systemTrayMenu = [];
currentWindow.listen('tauri://system_tray_menu_item_click', function (tauriEvent) {
    // get clicked menu item id
    const needle = tauriEvent.payload.id;

    // find matching menu item
    const menuItem = systemTrayMenu
        // remove separators
        .filter(([id]) => id !== '---')
        // remove disabled options and options without click handler
        .filter(([, , cb, options = {}]) => cb && !options.disabled)
        .find(([id]) => id === needle);

    // none found
    if (!menuItem) return;

    // clicked!
    const [, , cb] = menuItem;
    cb(tauriEvent);
});
export const setSystemTrayMenu = (menu = []) => {
    // Set reference so we can call onclick handlers
    systemTrayMenu = menu;

    // Create the menu
    invoke('set_system_tray_menu', {
        menu: JSON.stringify(
            menu.map(([id, title, , options = {}]) => {
                return {
                    separator: id === '---',
                    id: id || '',
                    title: title || '',
                    disabled: options.disabled || false,
                };
            })
        ),
    });
};

const centerWindowBelowSystemTrayIcon = async (e) => {
    // get tray icon position and size
    const { position, size, scale_factor } = e.detail.payload;

    const trayRect = {
        x: position.x / scale_factor,
        y: position.y / scale_factor,
        width: size.width / scale_factor,
        height: size.height / scale_factor,
    };

    // need size of window to position below tray icon
    const windowSize = await getWindowSize();

    // center window below tray icon
    const windowPosition = {
        x: trayRect.x + trayRect.width / 2 - windowSize.width / 2,
        y: trayRect.y,
    };

    // get monitors
    const availableMonitors = await __TAURI__.window.availableMonitors();

    //
    const monitorRects = availableMonitors.map(({ position, size, scaleFactor }) => ({
        x: position.x / scaleFactor,
        y: position.y / scaleFactor,
        width: size.width / scaleFactor,
        height: size.height / scaleFactor,
    }));

    const windowMonitor = monitorRects.find((monitor) => {
        return (
            trayRect.x >= monitor.x &&
            trayRect.x < monitor.x + monitor.width &&
            trayRect.y >= monitor.y &&
            trayRect.y < monitor.y + monitor.height
        );
    });

    // get window offset
    let windowOffsetX = 0;
    const windowRightEdge = windowPosition.x + windowSize.width;
    const monitorRightEdge = windowMonitor.x + windowMonitor.width;

    // move to left so doesn't exit view
    if (windowRightEdge > monitorRightEdge) {
        windowOffsetX = windowRightEdge - monitorRightEdge;
        document.querySelector(APP_SELECTOR).style.cssText = `--page-offset-x:${windowOffsetX}`;
    }

    // position below tray icon
    await setWindowPosition(windowPosition.x - windowOffsetX, windowPosition.y);
};

export const disableCenterWindowBelowSystemTrayIcon = () => {
    window.removeEventListener('tauri:system_tray_left_click', centerWindowBelowSystemTrayIcon);
};
export const enableCenterWindowBelowSystemTrayIcon = () => {
    disableCenterWindowBelowSystemTrayIcon();
    window.addEventListener('tauri:system_tray_left_click', centerWindowBelowSystemTrayIcon);
};

export const fetch = (url, options) => {
    const { ResponseType, Body } = __TAURI__.http;

    // use JSON body
    if (
        options.method === 'POST' &&
        options.headers &&
        /json/.test(options.headers['Content-Type'])
    ) {
        options.body = Body.json(
            typeof options.body === 'string' ? JSON.parse(options.body) : options.body
        );
        options.responseType = 'text';
    }

    // set response type
    const resTypes = {
        text: ResponseType.Text,
        json: ResponseType.JSON,
        binary: ResponseType.Binary,
    };

    return __TAURI__.http.fetch(url, {
        ...options,
        responseType: resTypes[options.responseType] || ResponseType.JSON,
    });
};

let currentShortcuts = [];
export const registerShortcuts = async (shortcuts = []) => {
    // test if has changed
    if (currentShortcuts && shortcuts) {
        const toShortcuts = (item) => item[0].join('+');
        if (arrayEqual(currentShortcuts.map(toShortcuts), shortcuts.map(toShortcuts))) return;
    }

    // remove old shortcuts
    await globalShortcut.unregisterAll();

    // register new shortcuts
    for (const [keys, handler] of shortcuts) {
        if (!keys.length) continue;
        try {
            await globalShortcut.register(keys.join('+'), handler);
        } catch (err) {
            console.log('Invalid key combination', keys);
        }
    }

    // remember
    currentShortcuts = [...shortcuts];
};

// tauri:// events
['blur', 'focus', 'resize', 'system_tray_left_click', 'system_tray_menu_item_click'].forEach(
    (type) => {
        currentWindow.listen('tauri://' + type, function (tauriEvent) {
            console.log('🛎', 'tauri://' + type, tauriEvent);
            window.dispatchEvent(
                new CustomEvent('tauri:' + type, {
                    detail: tauriEvent,
                })
            );
        });
    }
);
