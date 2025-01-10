// Get the app module
import { Hotlist } from './hotlist.js';

// Get the Tauri helper module
import * as Tauri from './tauri.js';

// app reference
let app;

// Constants
const STORE_URL =
    'https://pqina.lemonsqueezy.com/checkout/buy/f62d878f-e189-4f6a-992d-322fc3247ddc';

const VERSION_URL = 'https://pqina.nl/hotlist/latest.txt';

// Add system tray
// Tauri.setSystemTrayMenu([
//     [
//         'clear_completed',
//         'Clear completed',
//         () => {
//             app.items = app
//                 .getState()
//                 // remove empty items
//                 .items.filter((item) => item.value.length)
//                 // remove done
//                 .filter((item) => !item.isDone);
//         },
//     ],
//     ['beta', 'Beta 0.0.10', undefined, { disabled: true }],
//     [
//         'view_settings',
//         'Settings…',
//         () => {
//             app.activePage = 'settings';
//             showApp();
//         },
//     ],
//     ['---'],
//     [
//         'reset_list',
//         'Reset list',
//         () => {
//             app.items = [];
//         },
//     ],
//     ['---'],
//     [
//         'check_for_updates',
//         'Check for updates…',
//         () => {
//             console.log('Check for updates');
//         },
//     ],
//     ['---'],
//     [
//         'quit',
//         'Quit',
//         async () => {
//             console.log('quit');

//             // save state
//             await Tauri.writeState(app.getState());

//             // quit
//             Tauri.quit();
//         },
//     ],
// ]);

// Auto center
Tauri.enableCenterWindowBelowSystemTrayIcon();

// creates the app
const createApp = async () => {
    // restore state
    let state = {};
    try {
        state = await Tauri.readState();

        // convert every state to modern state

        // root settings rename
        if (state.maxItems) {
            state.itemLimit = state.maxItems;
            delete state.maxItems;
        }

        if (state.removeOnComplete) {
            state.itemCompleteAction = 'remove';
            delete state.removeOnComplete;
        }

        // state root settings -> state.settings
        if (state.itemLimit) {
            state.settings = {
                itemLimit: state.itemLimit,
                itemCompleteAction: state.itemCompleteAction,
            };
            delete state.itemLimit;
            delete state.itemCompleteAction;
        }

        // done -> isDone
        if (state.items && state.items.length && typeof state.items[0].done === 'boolean')
            state.items = state.items.map((item) => {
                const isDone = item.done;
                delete item.done;
                return {
                    ...item,
                    isDone,
                };
            });

        // done
        console.log('Restoring state', state);
    } catch (err) {
        console.error(err);
    }

    // make sure shows correct icon
    syncSystemTrayIconWithItems(state.items);

    // register shortcuts
    Tauri.registerShortcuts([
        [(state.settings && state.settings.shortcutToggleHotlist) || [], toggleApp],
    ]);

    // Create the app
    app = new Hotlist({
        target: document.getElementById('app'),
        props: {
            // restored state
            ...state,

            // other props
            visible: false,

            // connection formatter
            transformSyncSrc: (src) => {
                return `
                // fetch API replacement so we can fetch with Tauri
                const fetch = (url, options) => _post('fetch', url, options);
                ${src}`;
            },
            onSyncMessage: (command, ...args) =>
                new Promise((resolve, reject) => {
                    if (command !== 'fetch') reject('Invalid command');
                    Tauri.fetch(...args)
                        .then((res) => {
                            let json;
                            try {
                                json = JSON.parse(res.data);
                            } catch (err) {}
                            resolve({
                                text: res.data,
                                json,
                                ok: res.ok,
                                status: res.status,
                                statusText: 'Unknown',
                            });
                        })
                        .catch(reject);
                }),
        },
    });

    // route events
    app.$on('hide', () => {
        // hide app
        app.visible = false;

        // hide now
        Tauri.hideWindow();
    });

    app.$on('resize', (e) => {
        Tauri.setWindowSize(440, e.detail.height + 40);
    });

    app.$on('url', (e) => {
        Tauri.openURL(e.detail.url);
    });

    app.$on('sync', (e) => {
        // update system tray
        syncSystemTrayIconWithItems(e.detail.items);

        // set shortcuts
        Tauri.registerShortcuts([[e.detail.settings.shortcutToggleHotlist, toggleApp]]);
    });

    // when app hides, hide window
    app.$on('hidden', () => {
        // hide the window
        Tauri.hideWindow();

        // switch back to todolist
        app.activePage = 'todolist';
    });
};

const toggleApp = async () => {
    const isVisible = await Tauri.isWindowVisible();

    // toggle window
    if (isVisible) return await hideApp();

    // show and focus window
    await showApp();
};

const showApp = async () => {
    // show page
    await Tauri.showWindow();

    // show view
    app.visible = true;

    // focus page
    await Tauri.focusWindow();
};

const hideApp = async () => {
    // hide view
    app.visible = false;

    // if app already hidden, hide window
    app.isHidden() && Tauri.hideWindow();
};

const checkForUpdates = async (url) => {
    try {
        // request gumroad product page
        const { data: storeVersion } = await Tauri.fetch(url, {
            responseType: 'text',
        });

        console.log(storeVersion);

        if (!storeVersion)
            return Tauri.showDialog(
                `Something went wrong requesting the latest release version. Please try again at a later time.`,
                { type: 'error' }
            );

        // remove 'v' from store version if needed
        const latestVersion = storeVersion.substring(1);

        // is same, no update needed
        const currentVersion = await Tauri.getAppVersion();
        if (latestVersion === currentVersion)
            return Tauri.showDialog(`You're on the latest version.`);

        // you can download a new version
        const yes = await Tauri.showConfirm(
            `A newer version of Hotlist is available, would you like to open the download page now?`
        );
        if (yes) Tauri.openURL(STORE_URL);
    } catch (err) {
        console.error(err);
    }
};

const syncSystemTrayIconWithItems = (items) => {
    // make sure tray icon matches total items
    const totalNumberIcons = 9;
    const relevantItems = (items || []).filter((item) => item.value.length);
    const done = relevantItems.filter((item) => item.isDone).length;
    const total = relevantItems.length;

    let image = '';
    let tooltip = '';

    if (done === 0 && total === 0) {
        // let's get started state
        image = 'edit';
        tooltip = `Let's create todays Hotlist`;
    } else if (done === total) {
        // all done!
        image = 'done';
        tooltip = 'All done for today!';
    } else {
        // total items remaning
        const remaining = Math.max(1, total - done);
        if (remaining <= totalNumberIcons) {
            image = Math.min(Math.max(1, total - done), totalNumberIcons);
        } else {
            image = 'lots';
        }
        tooltip = `${done} of ${total} tasks completed`;
    }

    // update icon
    Tauri.setSystemTrayIcon('icon_' + image + '_Template');

    // update tooltip
    Tauri.setSystemTrayTooltip(tooltip);
};

window.addEventListener('tauri:system_tray_left_click', async () => {
    // toggle window
    if (await Tauri.isWindowVisible()) return await hideApp();

    // show and focus it
    await showApp();
});

window.addEventListener('tauri:blur', async () => {
    // save state
    try {
        await Tauri.writeState(app.getState());
    } catch (err) {
        console.error(err);
    }

    // hide the app
    if (await Tauri.isWindowVisible()) hideApp();
});

// temporary fallback
window.addEventListener('tauri:system_tray_menu_item_click', (e) => {
    // get clicked menu item id
    const needle = e.detail.payload.id;
    const action = {
        clear_completed: () => {
            app.items = app
                .getState()
                // remove empty items
                .items.filter((item) => item.value.length)
                // remove done
                .filter((item) => !item.isDone);
        },
        view_settings: async () => {
            app.activePage = 'settings';
            await showApp();
        },
        reset_list: () => {
            app.items = [];
        },
        check_for_updates: () => checkForUpdates(VERSION_URL),
        quit: async () => {
            // save state
            await Tauri.writeState(app.getState());

            // quit
            Tauri.quit();
        },
    }[needle];

    if (!action) return;

    // Run action
    action();
});

// Go!
let appFactoryCalled = false;
window.addEventListener('load', () => {
    // Just in case for some insane reason "load" fires twice
    if (!appFactoryCalled) createApp();

    // We've ran the factory
    appFactoryCalled = true;
});
