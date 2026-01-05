# Camera

_A React component that renders a preview for the device's front or back camera._

Available on platforms android (device-only), ios (device-only), web

`expo-camera` provides a React component that renders a preview of the device's front or back camera. The camera's parameters such as zoom, torch, and flash mode are adjustable. Using `CameraView`, you can take photos and record videos that are saved to the app's cache. The component is also capable of detecting bar codes appearing in the preview. Run the [example](#usage) on your device to see all these features working together.

## Installation

```bash
$ npx expo install expo-camera
```

If you are installing this in an existing React Native app, make sure to install `expo` in your project.

## Configuration in app config

You can configure `expo-camera` using its built-in [config plugin](https://docs.expo.dev/config-plugins/introduction/) if you use config plugins in your project ([Continuous Native Generation (CNG)](https://docs.expo.dev/workflow/continuous-native-generation/)). The plugin allows you to configure various properties that cannot be set at runtime and require building a new app binary to take effect. If your app does **not** use CNG, then you'll need to manually configure the library.

```json app.json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone",
          "recordAudioAndroid": true
        }
      ]
    ]
  }
}
```

### Configurable properties
| Name | Default | Description |
| --- | --- | --- |
| `cameraPermission` | `"Allow $(PRODUCT_NAME) to access your camera"` | Only for: ios. A string to set the [`NSCameraUsageDescription`](#ios) permission message. |
| `microphonePermission` | `"Allow $(PRODUCT_NAME) to access your microphone"` | Only for: ios. A string to set the [`NSMicrophoneUsageDescription`](#ios) permission message. |
| `recordAudioAndroid` | `true` | Only for: android. A boolean that determines whether to enable the `RECORD_AUDIO` permission on Android. |

<ConfigReactNative>

If you're not using Continuous Native Generation ([CNG](https://docs.expo.dev/workflow/continuous-native-generation/)) (you're using native **android** and **ios** projects manually), then you need to configure following permissions in your native projects:

**Android**

- `expo-camera` automatically adds `android.permission.CAMERA` permission to your project's **android/app/src/main/AndroidManifest.xml**. If you want to record videos with audio, include `RECORD_AUDIO` permission:

  ```xml
  <!-- Added permission -->
  <uses-permission android:name="android.permission.CAMERA" />

  <!-- Only add when recording videos with audio -->
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  ```

- Then, adjust the **android/build.gradle** file to add new maven block after all other repositories as show below:

  ```groovy
  allprojects {
    repositories {
        // * Your other repositories here *
        // * Add a new maven block after other repositories / blocks *
        maven {
            // expo-camera bundles a custom com.google.android:cameraview
            url "$rootDir/../node_modules/expo-camera/android/maven"
        }
    }
  }
  ```

**iOS**

- Add `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` keys to your project's **ios/[app]/Info.plist**:

  ```xml
  <key>NSCameraUsageDescription</key>
  <string>Allow $(PRODUCT_NAME) to access your camera</string>
  <key>NSMicrophoneUsageDescription</key>
  <string>Allow $(PRODUCT_NAME) to access your microphone</string>
  ```

</ConfigReactNative>

## Usage

> **warning** Only one Camera preview can be active at any given time. If you have multiple screens in your app, you should unmount `Camera` components whenever a screen is unfocused.

```tsx
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function App() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
          <Text style={styles.text}>Flip Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    width: '100%',
    paddingHorizontal: 64,
  },
  button: {
    flex: 1,
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});
```

### Advanced usage

[Camera app example](https://github.com/expo/examples/tree/master/with-camera)

## Web support

Most browsers support a version of web camera functionality, you can check out the [web camera browser support here](https://caniuse.com/#feat=stream). Image URIs are always returned as base64 strings because local file system paths are unavailable in the browser.

### Chrome `iframe` usage

When using **Chrome versions 64+**, if you try to use a web camera in a cross-origin iframe nothing will render. To add support for cameras in your iframe simply add the attribute `allow="microphone; camera;"` to the iframe element:

```html
<iframe src="..." allow="microphone; camera;">
  <!-- <CameraView /> -->
</iframe>
```

## API

```js
import { CameraView } from 'expo-camera';
```

## API: expo-camera

### CameraNativeModule (*Class*)
#### Properties
- `dismissScanner` (() => Promise<void>)
- `getAvailableVideoCodecsAsync` (() => Promise<VideoCodec[]>)
- `getCameraPermissionsAsync` (() => Promise<PermissionResponse>)
- `getMicrophonePermissionsAsync` (() => Promise<PermissionResponse>)
- `isAvailableAsync` (() => Promise<boolean>)
- `isModernBarcodeScannerAvailable` (boolean)
- `launchScanner` ((options: ScanningOptions) => Promise<void>)
- `requestCameraPermissionsAsync` (() => Promise<PermissionResponse>)
- `requestMicrophonePermissionsAsync` (() => Promise<PermissionResponse>)
- `scanFromURLAsync` ((url: string, barcodeTypes: BarcodeType[]) => Promise<BarcodeScanningResult[]>)
- `toggleRecordingAsyncAvailable` (boolean)
#### Methods
- `addListener(eventName: EventName, listener: indexedAccess): EventSubscription`
  Adds a listener for the given event name.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |
  | `listener` | indexedAccess | - |

- `emit(eventName: EventName, args: Parameters<indexedAccess>)`
  Synchronously calls all the listeners attached to that specific event.
  The event can include any number of arguments that will be passed to the listeners.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |
  | `args` | Parameters<indexedAccess> | - |

- `listenerCount(eventName: EventName): number`
  Returns a number of listeners added to the given event.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |

- `removeAllListeners(eventName: 'onModernBarcodeScanned')`
  Removes all listeners for the given event name.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | 'onModernBarcodeScanned' | - |

- `removeListener(eventName: EventName, listener: indexedAccess)`
  Removes a listener for the given event name.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |
  | `listener` | indexedAccess | - |

- `startObserving(eventName: EventName)`
  Function that is automatically invoked when the first listener for an event with the given name is added.
  Override it in a subclass to perform some additional setup once the event started being observed.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |

- `stopObserving(eventName: EventName)`
  Function that is automatically invoked when the last listener for an event with the given name is removed.
  Override it in a subclass to perform some additional cleanup once the event is no longer observed.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |

### CameraView (*Class*)
#### Properties
- `_cameraHandle?` (null | number)
- `_cameraRef` (React.RefObject<null | CameraViewRef>)
  Default: `...`
- `_lastEvents` (object)
  Default: `{}`
- `_lastEventsTimes` (object)
  Default: `{}`
- `ConversionTables` ({ flash: Record<number | query | 'toString' | 'charAt' | 'charCodeAt' | 'concat' | 'indexOf' | 'lastIndexOf' | 'localeCompare' | 'match' | 'replace' | 'search' | 'slice' | 'split' | 'substring' | 'toLowerCase' | 'toLocaleLowerCase' | 'toUpperCase' | 'toLocaleUpperCase' | 'trim' | 'length' | 'substr' | 'valueOf' | 'codePointAt' | 'includes' | 'endsWith' | 'normalize' | 'repeat' | 'startsWith' | 'anchor' | 'big' | 'blink' | 'bold' | 'fixed' | 'fontcolor' | 'fontsize' | 'italics' | 'link' | 'small' | 'strike' | 'sub' | 'sup' | 'padStart' | 'padEnd' | 'trimEnd' | 'trimStart' | 'trimLeft' | 'trimRight' | 'matchAll' | 'replaceAll' | 'at' | 'isWellFormed' | 'toWellFormed', undefined | string>; type: Record<number | query | 'toString' | 'charAt' | 'charCodeAt' | 'concat' | 'indexOf' | 'lastIndexOf' | 'localeCompare' | 'match' | 'replace' | 'search' | 'slice' | 'split' | 'substring' | 'toLowerCase' | 'toLocaleLowerCase' | 'toUpperCase' | 'toLocaleUpperCase' | 'trim' | 'length' | 'substr' | 'valueOf' | 'codePointAt' | 'includes' | 'endsWith' | 'normalize' | 'repeat' | 'startsWith' | 'anchor' | 'big' | 'blink' | 'bold' | 'fixed' | 'fontcolor' | 'fontsize' | 'italics' | 'link' | 'small' | 'strike' | 'sub' | 'sup' | 'padStart' | 'padEnd' | 'trimEnd' | 'trimStart' | 'trimLeft' | 'trimRight' | 'matchAll' | 'replaceAll' | 'at' | 'isWellFormed' | 'toWellFormed', undefined | string> })
  Default: `ConversionTables`
- `defaultProps` (CameraViewProps)
  Default: `...`
- `isModernBarcodeScannerAvailable` (boolean)
  Property that determines if the current device has the ability to use `DataScannerViewController` (iOS 16+) or the Google code scanner (Android).
  Default: `CameraManager.isModernBarcodeScannerAvailable`
#### Methods
- `_onAvailableLensesChanged(__namedParameters: { nativeEvent: AvailableLenses })`
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `__namedParameters` | { nativeEvent: AvailableLenses } | - |

- `_onCameraReady()`

- `_onMountError(__namedParameters: { nativeEvent: { message: string } })`
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `__namedParameters` | { nativeEvent: { message: string } } | - |

- `_onObjectDetected(callback?: Function): (__namedParameters: { nativeEvent: any }) => void`
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `callback` *(optional)* | Function | - |

- `_onResponsiveOrientationChanged(__namedParameters: { nativeEvent: { orientation: CameraOrientation } })`
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `__namedParameters` | { nativeEvent: { orientation: CameraOrientation } } | - |

- `_setReference(ref: React.Ref<CameraViewRef>)`
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `ref` | React.Ref<CameraViewRef> | - |

- `getAvailableLensesAsync(): Promise<string[]>`
  Returns the available lenses for the currently selected camera.
  Available on platform: ios
  Returns: Returns a Promise that resolves to an array of strings representing the lens type that can be passed to `selectedLens` prop.

- `getAvailablePictureSizesAsync(): Promise<string[]>`
  Get picture sizes that are supported by the device.
  Returns: Returns a Promise that resolves to an array of strings representing picture sizes that can be passed to `pictureSize` prop.
  The list varies across Android devices but is the same for every iOS.

- `getSupportedFeatures(): { isModernBarcodeScannerAvailable: boolean; toggleRecordingAsyncAvailable: boolean }`
  Returns an object with the supported features of the camera on the current device.

- `pausePreview(): Promise<void>`
  Pauses the camera preview. It is not recommended to use `takePictureAsync` when preview is paused.

- `recordAsync(options?: CameraRecordingOptions): Promise<undefined | { uri: string }>`
  Starts recording a video that will be saved to cache directory. Videos are rotated to match device's orientation.
  Flipping camera during a recording results in stopping it.
  Available on platforms: android, ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `options` *(optional)* | CameraRecordingOptions | A map of `CameraRecordingOptions` type. |
  Returns: Returns a Promise that resolves to an object containing video file `uri` property and a `codec` property on iOS.
  The Promise is returned if `stopRecording` was invoked, one of `maxDuration` and `maxFileSize` is reached or camera preview is stopped.

- `render(): React.JSX.Element`

- `resumePreview(): Promise<void>`
  Resumes the camera preview.

- `stopRecording()`
  Stops recording if any is in progress.
  Available on platforms: android, ios

- `takePictureAsync(optionsWithRef: CameraPictureOptions & { pictureRef: true }): Promise<PictureRef>`
  Takes a picture and returns an object that references the native image instance.
  > **Note**: Make sure to wait for the [`onCameraReady`](#oncameraready) callback before calling this method.

  > **Note:** Avoid calling this method while the preview is paused. On Android, this will throw an error. On iOS, this will take a picture of the last frame that is currently on screen.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `optionsWithRef` | CameraPictureOptions & { pictureRef: true } | An object in form of `CameraPictureOptions` type and `pictureRef` key set to `true`. |
  Returns: Returns a Promise that resolves to `PictureRef` class which contains basic image data, and a reference to native image instance which can be passed
  to other Expo packages supporting handling such an instance.

- `takePictureAsync(options?: CameraPictureOptions): Promise<CameraCapturedPicture>`
  Takes a picture and saves it to app's cache directory. Photos are rotated to match device's orientation
  (if `options.skipProcessing` flag is not enabled) and scaled to match the preview.
  > **Note**: Make sure to wait for the [`onCameraReady`](#oncameraready) callback before calling this method.

  > **Note:** Avoid calling this method while the preview is paused. On Android, this will throw an error. On iOS, this will take a picture of the last frame that is currently on screen.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `options` *(optional)* | CameraPictureOptions | An object in form of `CameraPictureOptions` type. |
  Returns: Returns a Promise that resolves to `CameraCapturedPicture` object, where `uri` is a URI to the local image file on Android,
  iOS, and a base64 string on web (usable as the source for an `Image` element). The `width` and `height` properties specify
  the dimensions of the image.

  `base64` is included if the `base64` option was truthy, and is a string containing the JPEG data
  of the image in Base64. Prepend it with `'data:image/jpg;base64,'` to get a data URI, which you can use as the source
  for an `Image` element for example.

  `exif` is included if the `exif` option was truthy, and is an object containing EXIF
  data for the image. The names of its properties are EXIF tags and their values are the values for those tags.

  > On native platforms, the local image URI is temporary. Use [`FileSystem.copy`](filesystem/#copydestination-1)
  > to make a permanent copy of the image.

- `toggleRecordingAsync(): Promise<undefined | void>`
  Pauses or resumes the video recording. Only has an effect if there is an active recording. On `iOS`, this method only supported on `iOS` 18.
  Example:
  ```ts
  const { toggleRecordingAsyncAvailable } = getSupportedFeatures()

  return (
   {toggleRecordingAsyncAvailable && (
     <Button title="Toggle Recording" onPress={toggleRecordingAsync} />
   )}
  )
  ```

- `dismissScanner(): Promise<void>`
  Dismiss the scanner presented by `launchScanner`.
  > **info** On Android, the scanner is dismissed automatically when a barcode is scanned.
  Available on platform: ios

- `getAvailableVideoCodecsAsync(): Promise<VideoCodec[]>`
  Queries the device for the available video codecs that can be used in video recording.
  Available on platform: ios
  Returns: A promise that resolves to a list of strings that represents available codecs.

- `isAvailableAsync(): Promise<boolean>`
  Check whether the current device has a camera. This is useful for web and simulators cases.
  This isn't influenced by the Permissions API (all platforms), or HTTP usage (in the browser).
  You will still need to check if the native permission has been accepted.
  Available on platform: web

- `launchScanner(options?: ScanningOptions): Promise<void>`
  On Android, we will use the [Google code scanner](https://developers.google.com/ml-kit/vision/barcode-scanning/code-scanner).
  On iOS, presents a modal view controller that uses the [`DataScannerViewController`](https://developer.apple.com/documentation/visionkit/scanning_data_with_the_camera) available on iOS 16+.
  Available on platforms: android, ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `options` *(optional)* | ScanningOptions | - |

- `onModernBarcodeScanned(listener: (event: ScanningResult) => void): EventSubscription`
  Invokes the `listener` function when a bar code has been successfully scanned. The callback is provided with
  an object of the `ScanningResult` shape, where the `type` refers to the bar code type that was scanned and the `data` is the information encoded in the bar code
  (in this case of QR codes, this is often a URL). See [`BarcodeType`](#barcodetype) for supported values.
  Available on platforms: ios, android
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `listener` | (event: ScanningResult) => void | Invoked with the [ScanningResult](#scanningresult) when a bar code has been successfully scanned. |

### PictureRef (*Class*)
A reference to a native instance of the image.
#### Properties
- `height` (number)
  Height of the image.
- `nativeRefType` (string)
  The type of the native reference.
- `width` (number)
  Width of the image.
#### Methods
- `addListener(eventName: EventName, listener: indexedAccess): EventSubscription`
  Adds a listener for the given event name.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |
  | `listener` | indexedAccess | - |

- `emit(eventName: EventName, args: Parameters<indexedAccess>)`
  Synchronously calls all the listeners attached to that specific event.
  The event can include any number of arguments that will be passed to the listeners.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |
  | `args` | Parameters<indexedAccess> | - |

- `listenerCount(eventName: EventName): number`
  Returns a number of listeners added to the given event.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |

- `release()`
  A function that detaches the JS and native objects to let the native object deallocate
  before the JS object gets deallocated by the JS garbage collector. Any subsequent calls to native
  functions of the object will throw an error as it is no longer associated with its native counterpart.

  In most cases, you should never need to use this function, except some specific performance-critical cases when
  manual memory management makes sense and the native object is known to exclusively retain some native memory
  (such as binary data or image bitmap). Before calling this function, you should ensure that nothing else will use
  this object later on. Shared objects created by React hooks are usually automatically released in the effect's cleanup phase,
  for example: `useVideoPlayer()` from `expo-video` and `useImage()` from `expo-image`.

- `removeAllListeners(eventName: never)`
  Removes all listeners for the given event name.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | never | - |

- `removeListener(eventName: EventName, listener: indexedAccess)`
  Removes a listener for the given event name.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |
  | `listener` | indexedAccess | - |

- `savePictureAsync(options?: SavePictureOptions): Promise<PhotoResult>`
  Saves the image to the file system in the cache directory.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `options` *(optional)* | SavePictureOptions | A map defining how modified image should be saved. |

- `startObserving(eventName: EventName)`
  Function that is automatically invoked when the first listener for an event with the given name is added.
  Override it in a subclass to perform some additional setup once the event started being observed.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |

- `stopObserving(eventName: EventName)`
  Function that is automatically invoked when the last listener for an event with the given name is removed.
  Override it in a subclass to perform some additional cleanup once the event is no longer observed.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `eventName` | EventName | - |

### Hooks

#### useCameraPermissions (*Function*)
Check or request permissions to access the camera.
This uses both `requestCameraPermissionsAsync` and `getCameraPermissionsAsync` to interact with the permissions.
- `useCameraPermissions(options?: PermissionHookOptions<object>): [null | PermissionResponse, RequestPermissionMethod<PermissionResponse>, GetPermissionMethod<PermissionResponse>]`
  Check or request permissions to access the camera.
  This uses both `requestCameraPermissionsAsync` and `getCameraPermissionsAsync` to interact with the permissions.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `options` *(optional)* | PermissionHookOptions<object> | - |
  Example:
  ```ts
  const [status, requestPermission] = useCameraPermissions();
  ```

#### useMicrophonePermissions (*Function*)
Check or request permissions to access the microphone.
This uses both `requestMicrophonePermissionsAsync` and `getMicrophonePermissionsAsync` to interact with the permissions.
- `useMicrophonePermissions(options?: PermissionHookOptions<object>): [null | PermissionResponse, RequestPermissionMethod<PermissionResponse>, GetPermissionMethod<PermissionResponse>]`
  Check or request permissions to access the microphone.
  This uses both `requestMicrophonePermissionsAsync` and `getMicrophonePermissionsAsync` to interact with the permissions.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `options` *(optional)* | PermissionHookOptions<object> | - |
  Example:
  ```ts
  const [status, requestPermission] = Camera.useMicrophonePermissions();
  ```

### Camera Methods

#### scanFromURLAsync (*Function*)
- `scanFromURLAsync(url: string, barcodeTypes: BarcodeType[]): Promise<BarcodeScanningResult[]>`
  Scan bar codes from the image at the given URL.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `url` | string | URL to get the image from. |
  | `barcodeTypes` | BarcodeType[] | An array of bar code types. Defaults to all supported bar code types on<br>the platform.<br>> __Note:__ Only QR codes are supported on iOS.<br>On android, the barcode should take up the majority of the image for best results. |
  Returns: A possibly empty array of objects of the `BarcodeScanningResult` shape, where the type
  refers to the barcode type that was scanned and the data is the information encoded in the barcode.

### Props

#### CameraViewProps (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `active` *(optional)* | boolean | A boolean that determines whether the camera should be active.<br>Useful in situations where the camera may not have unmounted but you still want to stop the camera session. Default: `true` Available on platform: ios |
| `animateShutter` *(optional)* | boolean | A boolean that determines whether the camera shutter animation should be enabled. Default: `true` |
| `autofocus` *(optional)* | FocusMode | Indicates the focus mode to use. Default: `off` Available on platform: ios |
| `barcodeScannerSettings` *(optional)* | BarcodeSettings | - |
| `enableTorch` *(optional)* | boolean | A boolean to enable or disable the torch. Default: `false` |
| `facing` *(optional)* | CameraType | Camera facing. Use one of `CameraType`. When `front`, use the front-facing camera.<br>When `back`, use the back-facing camera. Default: `'back'` |
| `flash` *(optional)* | FlashMode | Camera flash mode. Use one of `FlashMode` values. When `on`, the flash on your device will<br>turn on when taking a picture. When `off`, it won't. Setting it to `auto` will fire flash if required. Default: `'off'` |
| `mirror` *(optional)* | boolean | A boolean that determines whether the camera should mirror the image when using the front camera. Default: `false` |
| `mode` *(optional)* | CameraMode | Used to select image or video output. Default: `'picture'` |
| `mute` *(optional)* | boolean | If present, video will be recorded with no sound. Default: `false` |
| `onAvailableLensesChanged` *(optional)* | (event: AvailableLenses) => void | Callback invoked when the cameras available lenses change. Available on platform: ios |
| `onBarcodeScanned` *(optional)* | (scanningResult: BarcodeScanningResult) => void | Callback that is invoked when a barcode has been successfully scanned. The callback is provided with<br>an object of the [`BarcodeScanningResult`](#barcodescanningresult) shape, where the `type`<br>refers to the barcode type that was scanned, and the `data` is the information encoded in the barcode<br>(in this case of QR codes, this is often a URL). See [`BarcodeType`](#barcodetype) for supported values. |
| `onCameraReady` *(optional)* | () => void | Callback invoked when camera preview has been set. |
| `onMountError` *(optional)* | (event: CameraMountError) => void | Callback invoked when camera preview could not start. |
| `onResponsiveOrientationChanged` *(optional)* | (event: ResponsiveOrientationChanged) => void | Callback invoked when responsive orientation changes. Only applicable if `responsiveOrientationWhenOrientationLocked` is `true`. Available on platform: ios |
| `pictureSize` *(optional)* | string | A string representing the size of pictures [`takePictureAsync`](#takepictureasyncoptions) will take.<br>Available sizes can be fetched with [`getAvailablePictureSizesAsync`](#getavailablepicturesizesasync).<br>Setting this prop will cause the `ratio` prop to be ignored as the aspect ratio is determined by the selected size. |
| `poster` *(optional)* | string | A URL for an image to be shown while the camera is loading. Available on platform: web |
| `ratio` *(optional)* | CameraRatio | A string representing the aspect ratio of the preview. For example, `4:3` and `16:9`.<br>Note: Setting the aspect ratio here will change the scaleType of the camera preview from `FILL` to `FIT`.<br>Also, when using 1:1, devices only support certain sizes. If you specify an unsupported size, the closest supported ratio will be used. Available on platform: android |
| `responsiveOrientationWhenOrientationLocked` *(optional)* | boolean | Whether to allow responsive orientation of the camera when the screen orientation is locked (that is, when set to `true`,<br>landscape photos will be taken if the device is turned that way, even if the app or device orientation is locked to portrait). Available on platform: ios |
| `selectedLens` *(optional)* | string | Available lenses are emitted to the `onAvailableLensesChanged` callback whenever the currently selected camera changes or by calling [`getAvailableLensesAsync`](#getavailablelensesasync).<br>You can read more about the available lenses in the [Apple documentation](https://developer.apple.com/documentation/avfoundation/avcapturedevice/devicetype-swift.struct). Default: `'builtInWideAngleCamera'` Available on platform: ios |
| `videoBitrate` *(optional)* | number | The bitrate of the video recording in bits per second.<br>Note: On iOS, you must specify the video codec when calling `recordAsync` to use this option. |
| `videoQuality` *(optional)* | VideoQuality | Specify the quality of the recorded video. Use one of `VideoQuality` possible values:<br>for 16:9 resolution `2160p`, `1080p`, `720p`, `480p` : `Android only` and for 4:3 `4:3` (the size is 640x480).<br>If the chosen quality is not available for a device, the highest available is chosen. |
| `videoStabilizationMode` *(optional)* | VideoStabilization | The video stabilization mode used for a video recording. Use one of [`VideoStabilization.<value>`](#videostabilization).<br>You can read more about each stabilization type in [Apple Documentation](https://developer.apple.com/documentation/avfoundation/avcapturevideostabilizationmode). Available on platform: ios |
| `zoom` *(optional)* | number | A value between `0` and `1` being a percentage of device's max zoom, where `0` means not zoomed and `1` means maximum zoom. Default: `0` |

### Interfaces

#### Subscription (*Interface*)
A subscription object that allows to conveniently remove an event listener from the emitter.

### Types

#### AvailableLenses (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `lenses` | string[] | - |

#### BarcodeBounds (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `origin` | BarcodePoint | The origin point of the bounding box. |
| `size` | BarcodeSize | The size of the bounding box. |

#### BarcodePoint (*Type*)
These coordinates are represented in the coordinate space of the camera source (e.g. when you
are using the camera view, these values are adjusted to the dimensions of the view).
Type: Point

#### BarcodeScanningResult (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `bounds` | BarcodeBounds | The [`BarcodeBounds`](#barcodebounds) object.<br>`bounds` in some case will be representing an empty rectangle.<br>Moreover, `bounds` doesn't have to bound the whole barcode.<br>For some types, they will represent the area used by the scanner. |
| `cornerPoints` | BarcodePoint[] | Corner points of the bounding box.<br>`cornerPoints` is not always available and may be empty. On iOS, for `code39` and `pdf417`<br>you don't get this value.<br><br>**Note:** Corner points order is currently different across platforms. On Android,<br>[Google MLKit's native order](https://developers.google.com/android/reference/com/google/mlkit/vision/barcode/common/Barcode#getCornerPoints())<br>is used, which is `topLeft`, `topRight`, `bottomRight`, `bottomLeft`.<br>On iOS, the order is `bottomLeft`, `bottomRight`, `topLeft`, `topRight`. On Web, the order is<br>`topLeft`, `bottomLeft`, `topRight`, `bottomRight`. |
| `data` | string | The parsed information encoded in the barcode. |
| `extra` *(optional)* | AndroidBarcode | Extra information returned by the specific type of barcode. Available on platform: android |
| `type` | string | The barcode type. |

#### BarcodeSettings (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `barcodeTypes` | BarcodeType[] | - |

#### BarcodeSize (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `height` | number | The height value. |
| `width` | number | The width value. |

#### BarcodeType (*Type*)
The available barcode types that can be scanned.
Type: 'aztec' | 'ean13' | 'ean8' | 'qr' | 'pdf417' | 'upc_e' | 'datamatrix' | 'code39' | 'code93' | 'itf14' | 'codabar' | 'code128' | 'upc_a'

#### CameraCapturedPicture (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `base64` *(optional)* | string | A Base64 representation of the image. |
| `exif` *(optional)* | Partial<MediaTrackSettings> \| any | On Android and iOS this object may include various fields based on the device and operating system.<br>On web, it is a partial representation of the [`MediaTrackSettings`](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings) dictionary. |
| `format` | 'jpg' \| 'png' | The format of the captured image. |
| `height` | number | Captured image height. |
| `uri` | string | On web, the value of `uri` is the same as `base64` because file system URLs are not supported in the browser. |
| `width` | number | Captured image width. |

#### CameraEvents (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `onModernBarcodeScanned` | (event: ScanningResult) => void | - |

#### CameraMode (*Type*)
Type: 'picture' | 'video'

#### CameraMountError (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `message` | string | - |

#### CameraOrientation (*Type*)
Type: 'portrait' | 'portraitUpsideDown' | 'landscapeLeft' | 'landscapeRight'

#### CameraPictureOptions (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `additionalExif` *(optional)* | Record<string, any> | Additional EXIF data to be included for the image. Only useful when `exif` option is set to `true`. Available on platforms: android, ios |
| `base64` *(optional)* | boolean | Whether to also include the image data in Base64 format. |
| `exif` *(optional)* | boolean | Whether to also include the EXIF data for the image. |
| `imageType` *(optional)* | ImageType | Available on platform: web |
| `isImageMirror` *(optional)* | boolean | Available on platform: web |
| `mirror` *(optional)* | boolean | When set to `true`, the output image will be flipped along the vertical axis when using the front camera. Default: `false` Available on platforms: ios, android |
| `onPictureSaved` *(optional)* | (picture: CameraCapturedPicture) => void | A callback invoked when picture is saved. If set, the promise of this method will resolve immediately with no data after picture is captured.<br>The data that it should contain will be passed to this callback. If displaying or processing a captured photo right after taking it<br>is not your case, this callback lets you skip waiting for it to be saved. |
| `pictureRef` *(optional)* | boolean | Whether the camera should return an image ref that can be used directly in the `Image` component. |
| `quality` *(optional)* | number | Specify the compression quality from `0` to `1`. `0` means compress for small size, and `1` means compress for maximum quality. Default: `1` |
| `scale` *(optional)* | number | Available on platform: web |
| `shutterSound` *(optional)* | boolean | To programmatically disable the camera shutter sound Default: `true` |
| `skipProcessing` *(optional)* | boolean | If set to `true`, camera skips orientation adjustment and returns an image straight from the device's camera.<br>If enabled, `quality` option is discarded (processing pipeline is skipped as a whole).<br>Although enabling this option reduces image delivery time significantly, it may cause the image to appear in a wrong orientation<br>in the `Image` component (at the time of writing, it does not respect EXIF orientation of the images).<br>> **Note**: Enabling `skipProcessing` would cause orientation uncertainty. `Image` component does not respect EXIF<br>> stored orientation information, that means obtained image would be displayed wrongly (rotated by 90°, 180° or 270°).<br>> Different devices provide different orientations. For example some Sony Xperia or Samsung devices don't provide<br>> correctly oriented images by default. To always obtain correctly oriented image disable `skipProcessing` option. |

#### CameraRatio (*Type*)
Type: '4:3' | '16:9' | '1:1'

#### CameraRecordingOptions (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `codec` *(optional)* | VideoCodec | This option specifies what codec to use when recording the video. See [`VideoCodec`](#videocodec) for the possible values. Available on platform: ios |
| `maxDuration` *(optional)* | number | Maximum video duration in seconds. |
| `maxFileSize` *(optional)* | number | Maximum video file size in bytes. |
| `mirror` *(optional)* | boolean | If `true`, the recorded video will be flipped along the vertical axis. iOS flips videos recorded with the front camera by default,<br>but you can reverse that back by setting this to `true`. On Android, this is handled in the user's device settings. |

#### CameraType (*Type*)
Type: 'front' | 'back'

#### FlashMode (*Type*)
Type: 'off' | 'on' | 'auto'

#### FocusMode (*Type*)
This option specifies the mode of focus on the device.
- `on` - Indicates that the device should autofocus once and then lock the focus.
- `off` - Indicates that the device should automatically focus when needed.
Type: 'on' | 'off'

#### ImageType (*Type*)
Type: 'png' | 'jpg'

#### PermissionExpiration (*Type*)
Permission expiration time. Currently, all permissions are granted permanently.
Type: 'never' | number

#### PermissionHookOptions (*Type*)
Type: PermissionHookBehavior & Options

#### PermissionResponse (*Type*)
An object obtained by permissions get and request functions.
| Property | Type | Description |
| --- | --- | --- |
| `canAskAgain` | boolean | Indicates if user can be asked again for specific permission.<br>If not, one should be directed to the Settings app<br>in order to enable/disable the permission. |
| `expires` | PermissionExpiration | Determines time when the permission expires. |
| `granted` | boolean | A convenience boolean that indicates if the permission is granted. |
| `status` | PermissionStatus | Determines the status of the permission. |

#### PhotoResult (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `base64` *(optional)* | string | A Base64 representation of the image. |
| `height` | number | Height of the image. |
| `uri` | string | A URI to the modified image (usable as the source for an `Image` or `Video` element). |
| `width` | number | Width of the image. |

#### Point (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `x` | number | - |
| `y` | number | - |

#### ResponsiveOrientationChanged (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `orientation` | CameraOrientation | - |

#### SavePictureOptions (*Type*)
A map defining how modified image should be saved.
| Property | Type | Description |
| --- | --- | --- |
| `base64` *(optional)* | boolean | Whether to also include the image data in Base64 format. |
| `metadata` *(optional)* | Record<string, any> | Additional metadata to be included for the image. |
| `quality` *(optional)* | number | Specify the compression quality from `0` to `1`. `0` means compress for small size, and `1` means compress for maximum quality. |

#### ScanningOptions (*Type*)
Available on platform: ios
| Property | Type | Description |
| --- | --- | --- |
| `barcodeTypes` | BarcodeType[] | The type of codes to scan for. |
| `isGuidanceEnabled` *(optional)* | boolean | Guidance text, such as “Slow Down,” appears over the live video. Default: `true` Available on platform: ios |
| `isHighlightingEnabled` *(optional)* | boolean | Indicates whether the scanner displays highlights around recognized items. Default: `false` Available on platform: ios |
| `isPinchToZoomEnabled` *(optional)* | boolean | Indicates whether people can use a two-finger pinch-to-zoom gesture. Default: `true` Available on platform: ios |

#### ScanningResult (*Type*)
Type: Omit<BarcodeScanningResult, 'bounds' | 'cornerPoints'>

#### VideoCodec (*Type*)
This option specifies what codec to use when recording a video.
Available on platform: ios
Type: 'avc1' | 'hvc1' | 'jpeg' | 'apcn' | 'ap4h'

#### VideoQuality (*Type*)
Type: '2160p' | '1080p' | '720p' | '480p' | '4:3'

#### VideoStabilization (*Type*)
This option specifies the stabilization mode to use when recording a video.
Available on platform: ios
Type: 'off' | 'standard' | 'cinematic' | 'auto'

### Enums

#### PermissionStatus (*Enum*)
#### Members
- `DENIED` — User has denied the permission.
- `GRANTED` — User has granted the permission.
- `UNDETERMINED` — User hasn't granted or denied the permission yet.

## Permissions

### Android

This package automatically adds the `CAMERA` permission to your app. If you want to record videos with audio, you have to include the `RECORD_AUDIO` in your **app.json** inside the [`expo.android.permissions`](../config/app/#permissions) array.

<AndroidPermissions permissions={['CAMERA', 'RECORD_AUDIO']} />

### iOS

The following usage description keys are used by this library:

<IOSPermissions permissions={['NSCameraUsageDescription', 'NSMicrophoneUsageDescription']} />