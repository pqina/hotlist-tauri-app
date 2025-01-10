# Hotlist Tauri App Source Code

**Get things done, don't procrastinate in your todo list**

This is the Tauri app sourcecode for Hotlist a MacOS menubar app to manage daily tasks.

[Get Hotlist for free](https://pqina.nl/hotlist)

## Installation

Installing the node_modules:

```
npm install
```

Add `.env` file with this contents:

```bash
APPLE_SIGNING_IDENTITY=""
APPLE_ID=""
APPLE_PASSWORD=""
APPLE_PROVIDER_SHORT_NAME=""
APPLE_TEAM_ID=""
```

Build the [Hotlist web app repository](http://github.com/pqina/hotlist-web-app) and copy the `hotlist.js` and `hotlist.css` files to the `src` folder.

To build and start app:

```
npm run dev
```

## How To

### Generate new icons

Update `app-icon.png` and run `npm run tauri icon` to generate new icons.

### Generate a release

1. Update version number in _Cargo.toml_, _tauri.conf.json_, _main.rs_
2. Run `npm run ship` (if you get an error, run `npm run ship-verbose` to figure out what's wrong, if an agreement needs to be signed it can take a couple minutes for the signing process to register)
3. Leave the build script running, the DMG will auto close.

### Update Tauri

1. npm install @tauri-apps/cli@latest @tauri-apps/api@latest
2. open https://crates.io/crates/tauri/versions and https://crates.io/crates/tauri-build/versions
3. open Cargo.toml and update version of `tauri` and `tauri-build`
4. run `cargo update` in the `src-tauri` dir
5. If blocking message, remove `~/.cargo/.package-cache` file

## Attribution

If this repository was helpful for developing your product I'd truly appreciate a backlink to https://pqina.nl/hotlist

## License

MIT
