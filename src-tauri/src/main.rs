#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

// Tauri uses
use tauri::{AppHandle, SystemTray, CustomMenuItem, SystemTrayMenu, SystemTrayMenuItem, SystemTrayEvent, Manager, Icon, PhysicalSize, PhysicalPosition};

// Used to remove window shadow
use window_shadows::set_shadow;

// For sys tray icons
use std::path::PathBuf;

// Need to fix spaces
use raw_window_handle::HasRawWindowHandle;

//
// payloads
//
#[derive(Clone, serde::Serialize)]
struct TrayEventPayload {
    size: PhysicalSize<f64>,
    position: PhysicalPosition<f64>,
    scale_factor: f64                    
}

#[derive(Clone, serde::Serialize)]
struct MenuItemPayload {
    id: String
}

//
// commands
//
#[tauri::command]
fn set_system_tray_icon(app: tauri::AppHandle, icon: String) {

    let tray = app.tray_handle();

    let icon_resolution = match app.get_window("main").unwrap().scale_factor() {
        Ok(resolution) => resolution,
        Err(error) => panic!("Problem getting window resolution: {}", error),
    };
    
    let mut icon_version: String = "".to_owned();
    if icon_resolution > 1.0 {
        // Use higher resolution as somehow looks a bit crispier
        icon_version = "@3x".to_string();
    }
    let icon_file = format!("{}{}.png", icon, icon_version);
    
    let mut icon_path = PathBuf::new();
    icon_path.push("resources");
    icon_path.push(icon_file);

    let resource_path = app.path_resolver()
      .resolve_resource(icon_path)
      .expect("failed to resolve resource");

    match tray.set_icon(Icon::File(resource_path)) {
        Ok(_) => {},
        Err(error) => panic!("Problem setting tray title: {}", error),
    };
}

#[tauri::command]
fn set_system_tray_tooltip(app: tauri::AppHandle, tooltip: &str) {
    let tray = app.tray_handle();
    match tray.set_tooltip(tooltip) {
        Ok(_) => {},
        Err(error) => panic!("Problem setting tray title: {}", error),
    };

}

// #[derive(serde::Serialize, serde::Deserialize)]
// struct MenuItem {
//     id: String,
//     title: String,
//     disabled: bool,
//     separator: bool
// }

// #[tauri::command]
// fn set_system_tray_menu(app: AppHandle, _menu: &str) {

    // Could not get this to work :(

    // let menu_items: Vec<MenuItem> = serde_json::from_str(menu).unwrap();

    // https://play.rust-lang.org/?version=stable&mode=debug&edition=2018&gist=8508d051ecb80655ecf2ee0f8733a162
    // let tray_menu = menu_items.into_iter().fold(SystemTrayMenu::new(), |tray_menu, menu_item| {

    //     // if is separator
    //     if menu_item.separator {
    //         tray_menu.add_native_item(SystemTrayMenuItem::Separator)
    //     }
    //     // is menu item
    //     else {

    //         // create the menu item
    //         let mut custom_menu_item = CustomMenuItem::new(
    //             menu_item.id.as_str(), 
    //             menu_item.title.as_str()
    //         );

    //         // if should disable
    //         if menu_item.disabled {
    //             custom_menu_item = custom_menu_item.disabled();
    //         }

    //         // add it to the list
    //         tray_menu.add_item(custom_menu_item)
    //     }
    // });

    // let app = app.clone();
    // app.tray_handle().set_menu(
    //     SystemTrayMenu::new()
    //         .add_item(CustomMenuItem::new("test".to_string(), "Test"))
    //         .add_item(CustomMenuItem::new("exit".to_string(), "Exit"))
    // )
        
    // match tray
    //     .with_menu(menu)
    //     .build(&app) {
    //     Ok(_) => {},
    //     Err(error) => panic!("Problem setting system tray menu: {}", error),
    // };

    // match app.tray_handle().set_menu(menu) {
    //     Ok(_) => {},
    //     Err(error) => panic!("Problem setting system tray menu: {}", error),
    // };

    // let tray_handle = 
    // let tray = SystemTray::new();
    
    // println!("created tray");

    // let menu = SystemTrayMenu::new()
    //     .add_item(CustomMenuItem::new("test".to_string(), "Test"));

    // let app = app.clone();

    // match SystemTray::new().with_menu(menu).build(&app) {
    //     Ok(_) => {},
    //     Err(error) => panic!("Problem setting system tray menu: {}", error),
    // };

    // let tray = app.tray_handle();
    // match tray.set_menu(tray_menu) {
    //     Ok(_) => {},
    //     Err(error) => panic!("Problem setting system tray menu: {}", error),
    // // };

    // let menu = SystemTrayMenu::new()
    //     .add_item(CustomMenuItem::new("test".to_string(), "Test"));

    // let app = app.clone();

    // match SystemTray::new().on_event(handle_tray_event_test).with_menu(menu).build(&app){
    //     Ok(_) => {},
    //     Err(error) => panic!("Problem setting system tray menu: {}", error),
    // };
    

// }

// #[tauri::command]
// fn set_system_tray_menu(app: AppHandle, _menu: &str) {

//         println!("SETTING MENU");

//     // let app = app.clone();
//     match SystemTray::new()
//       .with_id("tray")
//       .with_menu(
//         SystemTrayMenu::new()
//             .add_item(
//                 CustomMenuItem::new("foo", "Foo")
//             )
//             .add_item(
//                 CustomMenuItem::new("bar", "Bar")
//             )
//         )
//         .on_event(move |_event| {

//         println!("HI");

//         })
//         .build(&app) {
//         Ok(_) => {
//             println!("OK");
//         },
//         Err(error) => panic!("Problem setting system tray menu: {}", error),
//     };

    
// }

// fn handle_tray_event_test(_event: SystemTrayEvent) {
//     println!("HI!");
// }

fn handle_tray_event(app: &AppHandle, event: SystemTrayEvent) {

    let window = app.get_window("main").unwrap();

    // Handle system tray menu item interaction
    if let SystemTrayEvent::MenuItemClick { id, .. } = &event {
        match window.emit("tauri://system_tray_menu_item_click", MenuItemPayload {
            id: id.to_string()
        }) {
            Ok(_) => {
            },
            Err(e) => {
                println!("Emit error: {}", e.to_string());
            }
        }
    }

    // Handle system tray interaction
    if let SystemTrayEvent::LeftClick {
        position,
        size,
        ..
        } = &event {

        let window = app.get_window("main").unwrap();

        // We scale size so all units are the same in front and backend
        let mut scale_factor = 1.0;

        // A very buggy way to detect if in high resolution screen (width on 1x screen is 34)
        let tray_icon_size = size.to_owned();
        if tray_icon_size.width > 40.0 {
            scale_factor = 2.0;
        }
        
        // Fire ze event!
        if let Err(e) = window.emit("tauri://system_tray_left_click", TrayEventPayload {
            size: size.to_owned(),
            position: position.to_owned(),
            scale_factor,
        }) {
            println!("Emit error: {}", e.to_string());
        }
    }

}

fn main() {

    tauri::Builder::default()
        .setup(|app| {

            // open devtools
            #[cfg(debug_assertions)]
            {
              let window = app.get_window("main").unwrap();
              window.open_devtools();
            }

            // Hide dock icon
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Disable shadows
            let window = app.get_window("main").unwrap();
            set_shadow(&window, false).expect("Unsupported platform!");

            // Enable show on all spaces
            match window.raw_window_handle() {
                raw_window_handle::RawWindowHandle::AppKit(handle) => {
                  use cocoa::appkit::{ NSWindow, NSWindowCollectionBehavior };
                  let ns_window = handle.ns_window as cocoa::base::id;
                  unsafe {
                    ns_window.setCollectionBehavior_(NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces)
                  }
                }
                _ => panic!("Something went horribly wrong trying to enable join all spaces")
            }

            // All good
            Ok(())
        })
        
        // Set up basic sustem tray, we'll update it later
        .system_tray(
            SystemTray::new()
                .with_menu(SystemTrayMenu::new()
                    .add_item(CustomMenuItem::new("clear_completed", "Clear completed"))
                    .add_item(CustomMenuItem::new("version", format!("Beta v{}", "0.0.24")).disabled())
                    .add_native_item(SystemTrayMenuItem::Separator)
                    .add_item(CustomMenuItem::new("view_settings", "Settings…"))
                    .add_native_item(SystemTrayMenuItem::Separator)
                    .add_item(CustomMenuItem::new("reset_list", "Reset list"))
                    .add_native_item(SystemTrayMenuItem::Separator)
                    .add_item(CustomMenuItem::new("check_for_updates", "Check for updates…"))
                    .add_native_item(SystemTrayMenuItem::Separator)
                    .add_item(CustomMenuItem::new("quit", "Quit"))
                )
        )
        
        // Handle system tray events
        .on_system_tray_event(handle_tray_event)
        
        // View can call it quits
        .invoke_handler(tauri::generate_handler![
            set_system_tray_icon, 
            set_system_tray_tooltip,
            // set_system_tray_menu
        ])
        
        // Let's go!
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    
}
