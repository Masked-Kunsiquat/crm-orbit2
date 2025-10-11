# Contacts

_A library that provides access to the phone's system contacts._

Available on platforms android, ios

`expo-contacts` provides access to the device's system contacts, allowing you to get contact information as well as adding, editing, or removing contacts.

On iOS, contacts have a multi-layered grouping system that you can also access through this API.

## Installation

```bash
$ npx expo install expo-contacts
```

If you are installing this in an existing React Native app, make sure to install `expo` in your project.

## Configuration in app config

You can configure `expo-contacts` using its built-in [config plugin](https://docs.expo.dev/config-plugins/introduction/) if you use config plugins in your project ([EAS Build](https://docs.expo.dev/build/introduction) or `npx expo run:[android|ios]`). The plugin allows you to configure various properties that cannot be set at runtime and require building a new app binary to take effect.

```json app.json
{
  "expo": {
    "plugins": [
      [
        "expo-contacts",
        {
          "contactsPermission": "Allow $(PRODUCT_NAME) to access your contacts."
        }
      ]
    ]
  }
}
```

### Configurable properties
| Name | Default | Description |
| --- | --- | --- |
| `contactsPermission` | `"Allow $(PRODUCT_NAME) to access your contacts"` | Only for: ios. A string to set the [`NSContactsUsageDescription`](#ios) permission message. |

<ConfigReactNative>

If you're not using Continuous Native Generation ([CNG](https://docs.expo.dev/workflow/continuous-native-generation/)) (you're using native **android** and **ios** projects manually), then you need to configure following permissions in your native projects:

- For Android, add `android.permission.READ_CONTACTS` and `android.permission.WRITE_CONTACTS` permissions to your project's **android/app/src/main/AndroidManifest.xml**:

  ```xml
  <uses-permission android:name="android.permission.READ_CONTACTS" />
  <uses-permission android:name="android.permission.WRITE_CONTACTS" />
  ```

- For iOS, add the `NSContactsUsageDescription` key to your project's **ios/[app]/Info.plist**:

  ```xml
  <key>NSContactsUsageDescription</key>
  <string>Allow $(PRODUCT_NAME) to access your contacts</string>
  ```

</ConfigReactNative>

## Usage

```jsx
import { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import * as Contacts from 'expo-contacts';

export default function App() {
  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Emails],
        });

        if (data.length > 0) {
          const contact = data[0];
          console.log(contact);
        }
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Contacts Module Example</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

## API

```js
import * as Contacts from 'expo-contacts';
```

## API: expo-contacts

### ContactAccessButton (*Class*)
Creates a contact access button to quickly add contacts under limited-access authorization.

For more details, you can read the Apple docs about the underlying [`ContactAccessButton`](https://developer.apple.com/documentation/contactsui/contactaccessbutton) SwiftUI view.
Available on platform: ios 18.0+
#### Methods
- `render(): null | React.JSX.Element`

- `isAvailable(): boolean`
  Returns a boolean whether the `ContactAccessButton` is available on the platform.
  This is `true` only on iOS 18.0 and newer.

### Contacts Methods

#### addContactAsync (*Function*)
- `addContactAsync(contact: Contact, containerId?: string): Promise<string>`
  Creates a new contact and adds it to the system.
  > **Note**: For Android users, the Expo Go app does not have the required `WRITE_CONTACTS` permission to write to Contacts.
  > You will need to create a [development build](https://docs.expo.dev/develop/development-builds/create-a-build/) and add permission in there manually to use this method.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `contact` | Contact | A contact with the changes you wish to persist. The `id` parameter will not be used. |
  | `containerId` *(optional)* | string | @tag-ios The container that will parent the contact. |
  Returns: A promise that fulfills with ID of the new system contact.
  Example:
  ```js
  const contact = {
    [Contacts.Fields.FirstName]: 'Bird',
    [Contacts.Fields.LastName]: 'Man',
    [Contacts.Fields.Company]: 'Young Money',
  };
  const contactId = await Contacts.addContactAsync(contact);
  ```

#### addExistingContactToGroupAsync (*Function*)
- `addExistingContactToGroupAsync(contactId: string, groupId: string): Promise<any>`
  Add a contact as a member to a group. A contact can be a member of multiple groups.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `contactId` | string | ID of the contact you want to edit. |
  | `groupId` | string | ID for the group you want to add membership to. |
  Example:
  ```js
  await Contacts.addExistingContactToGroupAsync(
    '665FDBCFAE55-D614-4A15-8DC6-161A368D',
    '161A368D-D614-4A15-8DC6-665FDBCFAE55'
  );
  ```

#### addExistingGroupToContainerAsync (*Function*)
- `addExistingGroupToContainerAsync(groupId: string, containerId: string): Promise<any>`
  Add a group to a container.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `groupId` | string | The group you want to target. |
  | `containerId` | string | The container you want to add membership to. |
  Example:
  ```js
  await Contacts.addExistingGroupToContainerAsync(
    '161A368D-D614-4A15-8DC6-665FDBCFAE55',
    '665FDBCFAE55-D614-4A15-8DC6-161A368D'
  );
  ```

#### createGroupAsync (*Function*)
- `createGroupAsync(name?: string, containerId?: string): Promise<string>`
  Create a group with a name, and add it to a container. If the container is `undefined`, the default container will be targeted.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `name` *(optional)* | string | Name of the new group. |
  | `containerId` *(optional)* | string | The container you to add membership to. |
  Returns: A promise that fulfills with ID of the new group.
  Example:
  ```js
  const groupId = await Contacts.createGroupAsync('Sailor Moon');
  ```

#### getContactByIdAsync (*Function*)
- `getContactByIdAsync(id: string, fields?: FieldType[]): Promise<Contact | undefined>`
  Used for gathering precise data about a contact. Returns a contact matching the given `id`.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `id` | string | The ID of a system contact. |
  | `fields` *(optional)* | FieldType[] | If specified, the fields defined will be returned. When skipped, all fields will be returned. |
  Returns: A promise that fulfills with `Contact` object with ID matching the input ID, or `undefined` if there is no match.
  Example:
  ```js
  const contact = await Contacts.getContactByIdAsync('161A368D-D614-4A15-8DC6-665FDBCFAE55');
  if (contact) {
    console.log(contact);
  }
  ```

#### getContactsAsync (*Function*)
- `getContactsAsync(contactQuery: ContactQuery): Promise<ContactResponse>`
  Return a list of contacts that fit a given criteria. You can get all of the contacts by passing no criteria.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `contactQuery` | ContactQuery | Object used to query contacts. |
  Returns: A promise that fulfills with `ContactResponse` object returned from the query.
  Example:
  ```js
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Emails],
  });

  if (data.length > 0) {
    const contact = data[0];
    console.log(contact);
  }
  ```

#### getContainersAsync (*Function*)
- `getContainersAsync(containerQuery: ContainerQuery): Promise<Container[]>`
  Query a list of system containers.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `containerQuery` | ContainerQuery | Information used to gather containers. |
  Returns: A promise that fulfills with array of containers that fit the query.
  Example:
  ```js
  const allContainers = await Contacts.getContainersAsync({
    contactId: '665FDBCFAE55-D614-4A15-8DC6-161A368D',
  });
  ```

#### getDefaultContainerIdAsync (*Function*)
- `getDefaultContainerIdAsync(): Promise<string>`
  Get the default container's ID.
  Available on platform: ios
  Returns: A promise that fulfills with default container ID.
  Example:
  ```js
  const containerId = await Contacts.getDefaultContainerIdAsync();
  ```

#### getGroupsAsync (*Function*)
- `getGroupsAsync(groupQuery: GroupQuery): Promise<Group[]>`
  Query and return a list of system groups.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `groupQuery` | GroupQuery | Information regarding which groups you want to get. |
  Returns: A promise that fulfills with array of groups that fit the query.
  Example:
  ```js
  const groups = await Contacts.getGroupsAsync({ groupName: 'sailor moon' });
  const allGroups = await Contacts.getGroupsAsync({});
  ```

#### getPagedContactsAsync (*Function*)
- `getPagedContactsAsync(contactQuery: ContactQuery): Promise<ContactResponse>`
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `contactQuery` | ContactQuery | - |

#### getPermissionsAsync (*Function*)
- `getPermissionsAsync(): Promise<ContactsPermissionResponse>`
  Checks user's permissions for accessing contacts data.
  Returns: A promise that resolves to a [ContactsPermissionResponse](#contactspermissionresponse) object.

#### isAvailableAsync (*Function*)
- `isAvailableAsync(): Promise<boolean>`
  Returns whether the Contacts API is enabled on the current device. This method does not check the app permissions.
  Returns: A promise that fulfills with a `boolean`, indicating whether the Contacts API is available on the current device. It always resolves to `false` on web.

#### presentAccessPickerAsync (*Function*)
- `presentAccessPickerAsync(): Promise<string[]>`
  Presents a modal which allows the user to select which contacts the app has access to.
  Using this function is reasonable only when the app has "limited" permissions.
  Available on platform: ios 18.0+
  Returns: A promise that resolves with an array of contact identifiers that were newly granted to the app.
  Contacts which the app lost access to are not listed. On platforms other than iOS and below 18.0, the promise rejects immediately.

#### presentContactPickerAsync (*Function*)
- `presentContactPickerAsync(): Promise<Contact | null>`
  Presents a native contact picker to select a single contact from the system. On Android, the `READ_CONTACTS` permission is required. You can
  obtain this permission by calling the [`Contacts.requestPermissionsAsync()`](#contactsrequestpermissionsasync) method. On iOS, no permissions are
  required to use this method.
  Returns: A promise that fulfills with a single `Contact` object if a contact is selected or `null` if no contact is selected (when selection is canceled).

#### presentFormAsync (*Function*)
- `presentFormAsync(contactId?: null | string, contact?: null | Contact, formOptions: FormOptions): Promise<any>`
  Present a native form for manipulating contacts.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `contactId` *(optional)* | null \| string | The ID of a system contact. |
  | `contact` *(optional)* | null \| Contact | A contact with the changes you want to persist. |
  | `formOptions` | FormOptions | Options for the native editor. |
  Example:
  ```js
  await Contacts.presentFormAsync('161A368D-D614-4A15-8DC6-665FDBCFAE55');
  ```

#### removeContactAsync (*Function*)
- `removeContactAsync(contactId: string): Promise<any>`
  Delete a contact from the system.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `contactId` | string | ID of the contact you want to delete. |
  Example:
  ```js
  await Contacts.removeContactAsync('161A368D-D614-4A15-8DC6-665FDBCFAE55');
  ```

#### removeContactFromGroupAsync (*Function*)
- `removeContactFromGroupAsync(contactId: string, groupId: string): Promise<any>`
  Remove a contact's membership from a given group. This will not delete the contact.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `contactId` | string | ID of the contact you want to remove. |
  | `groupId` | string | ID for the group you want to remove membership of. |
  Example:
  ```js
  await Contacts.removeContactFromGroupAsync(
    '665FDBCFAE55-D614-4A15-8DC6-161A368D',
    '161A368D-D614-4A15-8DC6-665FDBCFAE55'
  );
  ```

#### removeGroupAsync (*Function*)
- `removeGroupAsync(groupId: string): Promise<any>`
  Delete a group from the device.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `groupId` | string | ID of the group you want to remove. |
  Example:
  ```js
  await Contacts.removeGroupAsync('161A368D-D614-4A15-8DC6-665FDBCFAE55');
  ```

#### requestPermissionsAsync (*Function*)
- `requestPermissionsAsync(): Promise<ContactsPermissionResponse>`
  Asks the user to grant permissions for accessing contacts data.
  Returns: A promise that resolves to a [ContactsPermissionResponse](#contactspermissionresponse) object.

#### shareContactAsync (*Function*)
- `shareContactAsync(contactId: string, message: string, shareOptions: ShareOptions): Promise<any>`
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `contactId` | string | - |
  | `message` | string | - |
  | `shareOptions` | ShareOptions | - |

#### updateContactAsync (*Function*)
- `updateContactAsync(contact: { id: string } & Partial<Omit<Contact, 'id'>>): Promise<string>`
  Mutate the information of an existing contact. Due to an iOS bug, `nonGregorianBirthday` field cannot be modified.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `contact` | { id: string } & Partial<Omit<Contact, 'id'>> | A contact object including the wanted changes. Contact `id` is required. |
  Returns: A promise that fulfills with ID of the updated system contact if mutation was successful.
  Example:
  ```js
  const contact = {
    id: '161A368D-D614-4A15-8DC6-665FDBCFAE55',
    [Contacts.Fields.FirstName]: 'Drake',
    [Contacts.Fields.Company]: 'Young Money',
  };
  await Contacts.updateContactAsync(contact);
  ```

#### updateGroupNameAsync (*Function*)
- `updateGroupNameAsync(groupName: string, groupId: string): Promise<any>`
  Change the name of an existing group.
  Available on platform: ios
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `groupName` | string | New name for an existing group. |
  | `groupId` | string | ID of the group you want to edit. |
  Example:
  ```js
  await Contacts.updateGroupName('Expo Friends', '161A368D-D614-4A15-8DC6-665FDBCFAE55');
  ```

#### writeContactToFileAsync (*Function*)
- `writeContactToFileAsync(contactQuery: ContactQuery): Promise<string | undefined>`
  Query a set of contacts and write them to a local URI that can be used for sharing.
  | Parameter | Type | Description |
  | --- | --- | --- |
  | `contactQuery` | ContactQuery | Used to query contact you want to write. |
  Returns: A promise that fulfills with shareable local URI, or `undefined` if there was no match.
  Example:
  ```js
  const localUri = await Contacts.writeContactToFileAsync({
    id: '161A368D-D614-4A15-8DC6-665FDBCFAE55',
  });
  Share.share({ url: localUri, message: 'Call me!' });
  ```

### Props

#### ContactAccessButtonProps (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `backgroundColor` *(optional)* | ColorValue | A color of the button's background. Provided color should not be transparent,<br>otherwise it may not satisfy platform requirements for button legibility. Available on platform: ios 18.0+ |
| `caption` *(optional)* | 'default' \| 'email' \| 'phone' | When the query produces a single result, the contact access button shows the caption under the matching contact name.<br>It can be nothing (default), email address or phone number. Available on platform: ios 18.0+ |
| `ignoredEmails` *(optional)* | string[] | An array of email addresses. The search omits contacts matching query that also match any email address in this array. Available on platform: ios 18.0+ |
| `ignoredPhoneNumbers` *(optional)* | string[] | An array of phone numbers. The search omits contacts matching query that also match any phone number in this set. Available on platform: ios 18.0+ |
| `query` *(optional)* | string | A string to match against contacts not yet exposed to the app.<br>You typically get this value from a search UI that your app presents, like a text field. Available on platform: ios 18.0+ |
| `textColor` *(optional)* | ColorValue | A color of the button's title. Slightly dimmed version of this color is used for the caption text.<br>Make sure there is a good contrast between the text and the background,<br>otherwise platform requirements for button legibility may not be satisfied. Available on platform: ios 18.0+ |
| `tintColor` *(optional)* | ColorValue | A tint color of the button and the modal that is presented when there is more than one match. Available on platform: ios 18.0+ |

### Types

#### Address (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `city` *(optional)* | string | City name. |
| `country` *(optional)* | string | Country name |
| `id` *(optional)* | string | Unique ID. This value will be generated by the OS. |
| `isoCountryCode` *(optional)* | string | [Standard country code](https://www.iso.org/iso-3166-country-codes.html). |
| `label` | string | Localized display name. |
| `neighborhood` *(optional)* | string | Neighborhood name. |
| `poBox` *(optional)* | string | P.O. Box. |
| `postalCode` *(optional)* | string | Local post code. |
| `region` *(optional)* | string | Region or state name. |
| `street` *(optional)* | string | Street name. |

#### CalendarFormatType (*Type*)
Type: CalendarFormats | templateLiteral

#### Contact (*Type*)
A set of fields that define information about a single contact entity.
| Property | Type | Description |
| --- | --- | --- |
| `addresses` *(optional)* | Address[] | Locations. |
| `birthday` *(optional)* | Date | Birthday information in Gregorian format. |
| `company` *(optional)* | string | Organization the entity belongs to. |
| `contactType` | ContactType | Denoting a person or company. |
| `dates` *(optional)* | Date[] | A labeled list of other relevant user dates in Gregorian format. |
| `department` *(optional)* | string | Job department. |
| `emails` *(optional)* | Email[] | Email addresses. |
| `firstName` *(optional)* | string | Given name. |
| `id` *(optional)* | string | Immutable identifier used for querying and indexing. This value will be generated by the OS when the contact is created. |
| `image` *(optional)* | Image | Thumbnail image. On iOS it size is set to 320×320px, on Android it may vary. |
| `imageAvailable` *(optional)* | boolean | Used for efficient retrieval of images. |
| `instantMessageAddresses` *(optional)* | InstantMessageAddress[] | Instant messaging connections. |
| `isFavorite` *(optional)* | boolean | Whether the contact is starred. Available on platform: android |
| `jobTitle` *(optional)* | string | Job description. |
| `lastName` *(optional)* | string | Last name. |
| `maidenName` *(optional)* | string | Maiden name. |
| `middleName` *(optional)* | string | Middle name |
| `name` | string | Full name with proper format. |
| `namePrefix` *(optional)* | string | Dr., Mr., Mrs., and so on. |
| `nameSuffix` *(optional)* | string | Jr., Sr., and so on. |
| `nickname` *(optional)* | string | An alias to the proper name. |
| `nonGregorianBirthday` *(optional)* | Date | Birthday that doesn't conform to the Gregorian calendar format, interpreted based on the [calendar `format`](#date) setting. Available on platform: ios |
| `note` *(optional)* | string | Additional information.<br>> The `note` field [requires your app to request additional entitlements](https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_developer_contacts_notes).<br>> The Expo Go app does not contain those entitlements, so in order to test this feature you will need to [request the entitlement from Apple](https://developer.apple.com/contact/request/contact-note-field),<br>> set the [`ios.accessesContactNotes`](./../config/app/#accessescontactnotes) field in **app config** to `true`, and [create your development build](https://docs.expo.dev/develop/development-builds/create-a-build/). |
| `phoneNumbers` *(optional)* | PhoneNumber[] | Phone numbers. |
| `phoneticFirstName` *(optional)* | string | Pronunciation of the first name. |
| `phoneticLastName` *(optional)* | string | Pronunciation of the last name. |
| `phoneticMiddleName` *(optional)* | string | Pronunciation of the middle name. |
| `rawImage` *(optional)* | Image | Raw image without cropping, usually large. |
| `relationships` *(optional)* | Relationship[] | Names of other relevant user connections. |
| `socialProfiles` *(optional)* | SocialProfile[] | Social networks. Available on platform: ios |
| `urlAddresses` *(optional)* | UrlAddress[] | Associated web URLs. |

#### ContactQuery (*Type*)
Used to query contacts from the user's device.
| Property | Type | Description |
| --- | --- | --- |
| `containerId` *(optional)* | string | Get all contacts that belong to the container matching this ID. Available on platform: ios |
| `fields` *(optional)* | FieldType[] | If specified, the defined fields will be returned. If skipped, all fields will be returned. |
| `groupId` *(optional)* | string | Get all contacts that belong to the group matching this ID. Available on platform: ios |
| `id` *(optional)* | string \| string[] | Get contacts with a matching ID or array of IDs. |
| `name` *(optional)* | string | Get all contacts whose name contains the provided string (not case-sensitive). |
| `pageOffset` *(optional)* | number | The number of contacts to skip before gathering contacts. |
| `pageSize` *(optional)* | number | The max number of contacts to return. If skipped or set to `0` all contacts will be returned. |
| `rawContacts` *(optional)* | boolean | Prevent unification of contacts when gathering. Default: `false` Available on platform: ios |
| `sort` *(optional)* | ContactSort | Sort method used when gathering contacts. |

#### ContactResponse (*Type*)
The return value for queried contact operations like `getContactsAsync`.
| Property | Type | Description |
| --- | --- | --- |
| `data` | Contact[] | An array of contacts that match a particular query. |
| `hasNextPage` | boolean | This will be `true` if there are more contacts to retrieve beyond what is returned. |
| `hasPreviousPage` | boolean | This will be `true` if there are previous contacts that weren't retrieved due to `pageOffset` limit. |

#### ContactSort (*Type*)
Type: templateLiteral

#### ContactsPermissionResponse (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `accessPrivileges` *(optional)* | 'all' \| 'limited' \| 'none' | Indicates if your app has access to the whole or only part of the contact library. Possible values are:<br>- `'all'` if the user granted your app access to the whole contact library<br>- `'limited'` if the user granted your app access only to selected contacts (only available on iOS 18+)<br>- `'none'` |

#### ContactType (*Type*)
Type: ContactTypes | templateLiteral

#### Container (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `id` | string | - |
| `name` | string | - |
| `type` | ContainerType | - |

#### ContainerQuery (*Type*)
Used to query native contact containers.
Available on platform: ios
| Property | Type | Description |
| --- | --- | --- |
| `contactId` *(optional)* | string | Query all the containers that parent a contact. |
| `containerId` *(optional)* | string \| string[] | Query all the containers that matches ID or an array od IDs. |
| `groupId` *(optional)* | string | Query all the containers that parent a group. |

#### ContainerType (*Type*)
Type: ContainerTypes | templateLiteral

#### Date (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `day` | number | Day. |
| `format` *(optional)* | CalendarFormatType | Format for the date. This is provided by the OS, do not set this manually. |
| `id` *(optional)* | string | Unique ID. This value will be generated by the OS. |
| `label` *(optional)* | string | Localized display name. |
| `month` | number | Month - adjusted for JavaScript `Date` which starts at `0`. |
| `year` *(optional)* | number | Year. |

#### Email (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `email` *(optional)* | string | Email address. |
| `id` *(optional)* | string | Unique ID. This value will be generated by the OS. |
| `isPrimary` *(optional)* | boolean | Flag signifying if it is a primary email address. |
| `label` | string | Localized display name. |

#### FieldType (*Type*)
Type: Fields | templateLiteral

#### FormOptions (*Type*)
Denotes the functionality of a native contact form.
| Property | Type | Description |
| --- | --- | --- |
| `allowsActions` *(optional)* | boolean | Actions like share, add, create. |
| `allowsEditing` *(optional)* | boolean | Allows for contact mutation. |
| `alternateName` *(optional)* | string | Used if contact doesn't have a name defined. |
| `cancelButtonTitle` *(optional)* | string | The name of the left bar button. |
| `displayedPropertyKeys` *(optional)* | FieldType[] | The properties that will be displayed. On iOS those properties does nothing while in editing mode. |
| `groupId` *(optional)* | string | The parent group for a new contact. |
| `isNew` *(optional)* | boolean | Present the new contact controller. If set to `false` the unknown controller will be shown. |
| `message` *(optional)* | string | Controller title. |
| `preventAnimation` *(optional)* | boolean | Prevents the controller from animating in. |
| `shouldShowLinkedContacts` *(optional)* | boolean | Show or hide the similar contacts. |

#### Group (*Type*)
A parent to contacts. A contact can belong to multiple groups. Here are some query operations you can perform:
- Child Contacts: `getContactsAsync({ groupId })`
- Groups From Container: `getGroupsAsync({ containerId })`
- Groups Named: `getContainersAsync({ groupName })`
Available on platform: ios
| Property | Type | Description |
| --- | --- | --- |
| `id` *(optional)* | string | The editable name of a group. |
| `name` *(optional)* | string | Immutable id representing the group. |

#### GroupQuery (*Type*)
Used to query native contact groups.
Available on platform: ios
| Property | Type | Description |
| --- | --- | --- |
| `containerId` *(optional)* | string | Query all groups that belong to a certain container. |
| `groupId` *(optional)* | string | Query the group with a matching ID. |
| `groupName` *(optional)* | string | Query all groups matching a name. |

#### Image (*Type*)
Information regarding thumbnail images.
> On Android you can get dimensions using [`Image.getSize`](https://reactnative.dev/docs/image#getsize) method.
| Property | Type | Description |
| --- | --- | --- |
| `base64` *(optional)* | string | Image as Base64 string. |
| `height` *(optional)* | number | Image height Available on platform: ios |
| `uri` *(optional)* | string | A local image URI.<br>> **Note**: If you have a remote URI, download it first using  [`FileSystem.downloadAsync`](https://docs.expo.dev/versions/latest/sdk/filesystem/#filesystemdownloadasyncuri-fileuri-options). |
| `width` *(optional)* | number | Image width. Available on platform: ios |

#### InstantMessageAddress (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `id` *(optional)* | string | Unique ID. This value will be generated by the OS. |
| `label` | string | Localized display name. |
| `localizedService` *(optional)* | string | Localized name of app. |
| `service` *(optional)* | string | Name of instant messaging app. |
| `username` *(optional)* | string | Username in IM app. |

#### PermissionExpiration (*Type*)
Permission expiration time. Currently, all permissions are granted permanently.
Type: 'never' | number

#### PermissionResponse (*Type*)
An object obtained by permissions get and request functions.
| Property | Type | Description |
| --- | --- | --- |
| `canAskAgain` | boolean | Indicates if user can be asked again for specific permission.<br>If not, one should be directed to the Settings app<br>in order to enable/disable the permission. |
| `expires` | PermissionExpiration | Determines time when the permission expires. |
| `granted` | boolean | A convenience boolean that indicates if the permission is granted. |
| `status` | PermissionStatus | Determines the status of the permission. |

#### PhoneNumber (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `countryCode` *(optional)* | string | Country code. |
| `digits` *(optional)* | string | Phone number without format. |
| `id` *(optional)* | string | Unique ID. This value will be generated by the OS. |
| `isPrimary` *(optional)* | boolean | Flag signifying if it is a primary phone number. |
| `label` | string | Localized display name. |
| `number` *(optional)* | string | Phone number. |

#### Relationship (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `id` *(optional)* | string | Unique ID. This value will be generated by the OS. |
| `label` | string | Localized display name. |
| `name` *(optional)* | string | Name of related contact. |

#### SocialProfile (*Type*)
Available on platform: ios
| Property | Type | Description |
| --- | --- | --- |
| `id` *(optional)* | string | Unique ID. This value will be generated by the OS. |
| `label` | string | Localized display name. |
| `localizedProfile` *(optional)* | string | Localized profile name. |
| `service` *(optional)* | string | Name of social app. |
| `url` *(optional)* | string | Web URL. |
| `userId` *(optional)* | string | Username ID in social app. |
| `username` *(optional)* | string | Username in social app. |

#### UrlAddress (*Type*)
| Property | Type | Description |
| --- | --- | --- |
| `id` *(optional)* | string | Unique ID. This value will be generated by the OS. |
| `label` | string | Localized display name. |
| `url` *(optional)* | string | Web URL. |

### Enums

#### CalendarFormats (*Enum*)
This format denotes the common calendar format used to specify how a date is calculated in `nonGregorianBirthday` fields.
#### Members
- `Buddhist`
- `Chinese`
- `Coptic`
- `EthiopicAmeteAlem`
- `EthiopicAmeteMihret`
- `Gregorian`
- `Hebrew`
- `Indian`
- `Islamic`
- `IslamicCivil`
- `IslamicTabular`
- `IslamicUmmAlQura`
- `ISO8601`
- `Japanese`
- `Persian`
- `RepublicOfChina`

#### ContactTypes (*Enum*)
#### Members
- `Company` — Contact is group or company.
- `Person` — Contact is a human.

#### ContainerTypes (*Enum*)
Available on platform: ios
#### Members
- `CardDAV` — With cardDAV protocol used for sharing.
- `Exchange` — In association with email server.
- `Local` — A local non-iCloud container.
- `Unassigned` — Unknown container.

#### Fields (*Enum*)
Possible fields to retrieve for a contact.
#### Members
- `Addresses`
- `Birthday`
- `Company`
- `ContactType`
- `Dates`
- `Department`
- `Emails`
- `ExtraNames`
- `FirstName`
- `ID`
- `Image`
- `ImageAvailable`
- `InstantMessageAddresses`
- `IsFavorite`
- `JobTitle`
- `LastName`
- `MaidenName`
- `MiddleName`
- `Name`
- `NamePrefix`
- `NameSuffix`
- `Nickname`
- `NonGregorianBirthday`
- `Note`
- `PhoneNumbers`
- `PhoneticFirstName`
- `PhoneticLastName`
- `PhoneticMiddleName`
- `RawImage`
- `Relationships`
- `SocialProfiles`
- `UrlAddresses`

#### PermissionStatus (*Enum*)
#### Members
- `DENIED` — User has denied the permission.
- `GRANTED` — User has granted the permission.
- `UNDETERMINED` — User hasn't granted or denied the permission yet.

#### SortTypes (*Enum*)
#### Members
- `FirstName` — Sort by first name in ascending order.
- `LastName` — Sort by last name in ascending order.
- `None` — No sorting should be applied.
- `UserDefault` — The user default method of sorting.

## Permissions

### Android

This library automatically adds `READ_CONTACTS` and `WRITE_CONTACTS` permissions to your app:

<AndroidPermissions permissions={['READ_CONTACTS', 'WRITE_CONTACTS']} />

### iOS

The following usage description keys are used by this library:

<IOSPermissions permissions={['NSContactsUsageDescription']} />