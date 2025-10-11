# Haptics

_A library that provides access to the system's vibration effects on Android, the haptics engine on iOS, and the Web Vibration API on web._

Available on platforms android, ios, web

`expo-haptics` provides haptic (touch) feedback for:

- Android devices using Vibrator system service.
- iOS 10+ devices using the Taptic Engine.
- Web platforms using the Web Vibration API.

On iOS, the Taptic engine will do nothing if any of the following conditions are true on a user's device:

- Low Power Mode is enabled. This can be detected with [`expo-battery`](./battery/).
- User disabled the Taptic Engine in settings.
- iOS Camera is active (to prevent destabilization).
- iOS dictation is active (to not disturb the microphone input).

On web, the library uses the Web Vibration API. Note the following:

- The API must be supported by the browser (check [browser compatibility](https://caniuse.com/vibration))
- The device must have vibration hardware
- The user must grant permission to use vibration (usually automatic)
- Some browsers may ignore vibration in certain contexts (for example, background tabs)

## Installation

```bash
$ npx expo install expo-haptics
```

If you are installing this in an existing React Native app, make sure to install `expo` in your project.

## Configuration

On Android, this library requires permission to control vibration on the device. The `VIBRATE` permission is added automatically.

## Usage

```jsx
import { StyleSheet, View, Text, Button } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Haptics.selectionAsync</Text>
      <View style={styles.buttonContainer}>
        <Button title="Selection" onPress={() => /* @info */ Haptics.selectionAsync() /* @end */} />
      </View>
      <Text style={styles.text}>Haptics.notificationAsync</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="Success"
          onPress={
            () =>
              /* @info */ Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              ) /* @end */
          }
        />
        <Button
          title="Error"
          onPress={
            () =>
              /* @info */ Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              ) /* @end */
          }
        />
        <Button
          title="Warning"
          onPress={
            () =>
              /* @info */ Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning
              ) /* @end */
          }
        />
      </View>
      <Text style={styles.text}>Haptics.impactAsync</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="Light"
          onPress={
            () => /* @info */ Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) /* @end */
          }
        />
        <Button
          title="Medium"
          onPress={
            () => /* @info */ Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) /* @end */
          }
        />
        <Button
          title="Heavy"
          onPress={
            () => /* @info */ Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy) /* @end */
          }
        />
        <Button
          title="Rigid"
          onPress={
            () => /* @info */ Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid) /* @end */
          }
        />
        <Button
          title="Soft"
          onPress={
            () => /* @info */ Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft) /* @end */
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 10,
    marginBottom: 30,
    justifyContent: 'space-between',
  },
});
```

## API

```js
import * as Haptics from 'expo-haptics';
```

## API: expo-haptics

### Haptics Methods

#### impactAsync (*Function*)
- `impactAsync(style: ImpactFeedbackStyle): Promise<void>`
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `style` | ImpactFeedbackStyle | A collision indicator that on Android is simulated using [`Vibrator`](https://developer.android.com/reference/android/os/Vibrator)<br>and on iOS, it is directly mapped to [`UIImpactFeedbackStyle`](https://developer.apple.com/documentation/uikit/uiimpactfeedbackgenerator/feedbackstyle).<br>You can use one of `Haptics.ImpactFeedbackStyle.{Light, Medium, Heavy, Rigid, Soft}`. |
  Returns: A `Promise` which fulfills once native size haptics functionality is triggered.

#### notificationAsync (*Function*)
- `notificationAsync(type: NotificationFeedbackType): Promise<void>`
  The kind of notification response used in the feedback.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `type` | NotificationFeedbackType | A notification feedback type that on Android is simulated using [`Vibrator`](https://developer.android.com/reference/android/os/Vibrator)<br>and iOS is directly mapped to [`UINotificationFeedbackType`](https://developer.apple.com/documentation/uikit/uinotificationfeedbacktype).<br>You can use one of `Haptics.NotificationFeedbackType.{Success, Warning, Error}`. |
  Returns: A `Promise` which fulfills once native size haptics functionality is triggered.

#### performAndroidHapticsAsync (*Function*)
- `performAndroidHapticsAsync(type: AndroidHaptics): Promise<void>`
  Use the device haptics engine to provide physical feedback to the user.
  Available on platform: android
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `type` | AndroidHaptics | - |

#### selectionAsync (*Function*)
- `selectionAsync(): Promise<void>`
  Used to let a user know when a selection change has been registered.
  Returns: A `Promise` which fulfills once native size haptics functionality is triggered.

### Enums

#### AndroidHaptics (*Enum*)
Available on platform: android
#### Members
- `Clock_Tick` — The user has pressed either an hour or minute tick of a Clock.
- `Confirm` — A haptic effect to signal the confirmation or successful completion of a user interaction.
- `Context_Click` — The user has performed a context click on an object.
- `Drag_Start` — The user has started a drag-and-drop gesture. The drag target has just been "picked up".
- `Gesture_End` — The user has finished a gesture (for example, on the soft keyboard).
- `Gesture_Start` — The user has started a gesture (for example, on the soft keyboard).
- `Keyboard_Press` — The user has pressed a virtual or software keyboard key.
- `Keyboard_Release` — The user has released a virtual keyboard key.
- `Keyboard_Tap` — The user has pressed a soft keyboard key.
- `Long_Press` — The user has performed a long press on an object that results in an action being performed.
- `No_Haptics` — No haptic feedback should be performed.
- `Reject` — A haptic effect to signal the rejection or failure of a user interaction.
- `Segment_Frequent_Tick` — The user is switching between a series of many potential choices. For example, minutes on a clock face or individual percentages.
This constant is expected to be very soft, so as not to be uncomfortable when performed a lot in quick succession.
If the device can't make a suitably soft vibration, then it may not make any vibration.
- `Segment_Tick` — The user is switching between a series of potential choices. For example, items in a list or discrete points on a slider.
- `Text_Handle_Move` — The user has performed a selection/insertion handle move on text field.
- `Toggle_Off` — The user has toggled a switch or button into the off position.
- `Toggle_On` — The user has toggled a switch or button into the on position.
- `Virtual_Key` — The user has pressed on a virtual on-screen key.
- `Virtual_Key_Release` — The user has released a virtual key.

#### ImpactFeedbackStyle (*Enum*)
The mass of the objects in the collision simulated by a `UIImpactFeedbackGenerator` object
[`UINotificationFeedbackStyle`](https://developer.apple.com/documentation/uikit/uiimpactfeedbackgenerator/feedbackstyle).
#### Members
- `Heavy` — A collision between large, heavy user interface elements.
- `Light` — A collision between small, light user interface elements.
- `Medium` — A collision between moderately sized user interface elements.
- `Rigid` — A collision between user interface elements that are rigid, exhibiting a small amount of compression or elasticity.
- `Soft` — A collision between user interface elements that are soft, exhibiting a large amount of compression or elasticity.

#### NotificationFeedbackType (*Enum*)
The type of notification feedback generated by a `UINotificationFeedbackGenerator` object.
[`UINotificationFeedbackType`](https://developer.apple.com/documentation/uikit/uinotificationfeedbackgenerator/feedbacktype).
#### Members
- `Error` — A notification feedback type indicating that a task has failed.
- `Success` — A notification feedback type indicating that a task has completed successfully.
- `Warning` — A notification feedback type indicating that a task has produced a warning.