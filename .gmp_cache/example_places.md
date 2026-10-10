This document outlines key usage patterns, initialization strategies, and best
practices for integrating Google Maps Platform using the
`@vis.gl/react-google-maps` library, specifically focusing on the modern Places
UI Kit Web Components and experimental 3D Map features.

## 1. Core Initialization and Library Loading

All components must be nested within the `APIProvider`. 3D mapping and modern
Place Web Components often require the API to be initialized with the `beta`
version. Libraries are loaded dynamically using `useMapsLibrary`.

### 1.1 API Provider Setup

```tsx
import {APIProvider} from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY as string;

const App = () => {
  return (
    // Note: The 'beta' version is essential for Maps 3D and modern UI Kit features
    <APIProvider apiKey={API_KEY} version={'beta'}>
      <Layout />
    </APIProvider>
  );
};
```

### 1.2 Dynamic Library Loading

Accessing SDK classes (like `geometry` or `maps3d`) should use the
`useMapsLibrary` hook, ensuring the library is loaded before accessing its types
or methods.

```tsx
import {useMapsLibrary} from '@vis.gl/react-google-maps';

const MyComponent = () => {
  // Load the Places library
  const placesLibrary = useMapsLibrary('places');

  if (!placesLibrary) {
    return <div>Loading Places...</div>;
  }
  // Use placesLibrary API here...
};
```

## 2. Pattern 1: 3D Map Integration (Web Component Wrapper)

The 3D Map (`Map3D`) is exposed via a Web Component (`<gmp-map-3d>`).
Integrating this requires specific hooks to manage lifecycle, property
synchronization, and event listeners on the underlying DOM element.

### 2.1 Implementing `<Map3D>`

The `<Map3D>` component must use `useMapsLibrary('maps3d')` and interface
directly with the `<gmp-map-3d>` element reference.

```tsx
// Inside Map3DComponent definition (Conceptual wrapper)
import {useMapsLibrary} from '@vis.gl/react-google-maps';
import React, {memo, useEffect, useMemo} from 'react';
import {useCallbackRef, useDeepCompareEffect} from '../../utility-hooks'; // Custom hooks required

const Map3DComponent = (props: Map3DProps) => {
  useMapsLibrary('maps3d');

  // 1. Get reference to the underlying Web Component DOM node
  const [map3DElement, map3dRef] =
    useCallbackRef<google.maps.maps3d.Map3DElement>();

  // 2. Use a deep comparison effect to imperatively set properties
  //    (like defaultLabelsDisabled or other options)
  const {center, heading, tilt, range, roll, ...map3dOptions} = props;

  useDeepCompareEffect(() => {
    if (!map3DElement) return;
    Object.assign(map3DElement, map3dOptions);
  }, [map3DElement, map3dOptions]);

  // 3. Render the Web Component and pass properties as attributes
  return (
    <gmp-map-3d
      ref={map3dRef} // Attach ref here
      center={center}
      range={range}
      heading={heading}
      tilt={tilt}
      roll={roll}
      mode="SATELLITE">
      {/* Markers and custom elements render as children */}
      {props.children}
    </gmp-map-3d>
  );
};
```

### 2.2 Handling 3D Camera Events

The 3D Map exposes camera changes as custom DOM events (e.g.,
`gmp-centerchange`). Developers must listen to these events on the Web Component
reference.

```tsx
import {useEffect, useRef} from 'react';

/**
 * Binds event-listeners for all camera-related events to the Map3dElement.
 * Aggregates values (center, range, heading, tilt, roll) and dispatches via onCameraChange.
 */
export function useMap3DCameraEvents(
  mapEl?: google.maps.maps3d.Map3DElement | null,
  onCameraChange?: (cameraProps: Map3DCameraProps) => void
) {
  const cameraPropsRef = useRef<Map3DCameraProps>(DEFAULT_CAMERA_PROPS);

  useEffect(() => {
    if (!mapEl) return;

    const cleanupFns: (() => void)[] = [];
    const cameraPropNames = ['center', 'range', 'heading', 'tilt', 'roll'] as const;

    for (const p of cameraPropNames) {
      const removeListener = mapEl.addEventListener(`gmp-${p}change`, () => {
        const newValue = mapEl[p];
        if (newValue == null) return;

        if (p === 'center')
          // LatLngAltitude objects need to be converted to Literals via toJSON()
          cameraPropsRef.current.center = (
            newValue as google.maps.LatLngAltitude
          ).toJSON();
        else cameraPropsRef.current[p] = newValue as number;

        if (onCameraChange) {
            onCameraChange(cameraPropsRef.current);
        }
      });

      cleanupFns.push(() => mapEl.removeEventListener(`gmp-${p}change`, removeListener));
    }

    return () => {
      for (const removeListener of cleanupFns) removeListener();
    };
  }, [mapEl, onCameraChange]);
}
```

## 3. Pattern 2: Places UI Kit Integration

The Places UI Kit uses a collection of powerful Web Components (`gmp-*`) that
handle complex API calls internally. Interaction with these components is
primarily done by:

1.  Using the `ref` to get the DOM node.
2.  Synchronizing React props to Web Component properties via `usePropBinding`.
3.  Listening to custom DOM events via `useDomEventListener`.
4.  Configuring requests by appending nested request elements as children.

### 3.1 Basic Place Autocomplete

This component wraps `<gmp-basic-place-autocomplete>`. Note the use of
`createPortal` to correctly handle slotted children (like custom prediction
icons).

```tsx
import {useMapsLibrary} from '@vis.gl/react-google-maps';
import React, {useRef, useState, Children, useEffect} from 'react';
import {createPortal} from 'react-dom';
import {useDomEventListener, usePropBinding} from '../utility-hooks'; // Custom hooks required

export const BasicPlaceAutocomplete = props => {
  const placesLibrary = useMapsLibrary('places');
  const ref = useRef<google.maps.places.BasicPlaceAutocompleteElement | null>(
    null
  );
  const autocomplete = ref.current;
  const numChildren = Children.count(props.children);

  // State to hold the template element used for slotting children
  const [templateElement, setTemplateElement] =
    useState<HTMLTemplateElement | null>(null);

  // Bind props (like restrictions and biases) to the Web Component instance
  usePropBinding(autocomplete, 'includedPrimaryTypes', props.includedPrimaryTypes ?? null);
  usePropBinding(autocomplete, 'locationBias', props.locationBias ?? null);
  // ... bind other props

  // Bind custom DOM events
  useDomEventListener(autocomplete, 'gmp-select', props.onSelect);
  useDomEventListener(autocomplete, 'gmp-error', props.onError);

  // Logic to handle slotted children (e.g., custom prediction icons)
  useEffect(() => {
    if (numChildren === 0 || !placesLibrary || !autocomplete) return;

    // Create a template element for the 'prediction-item-icon' slot
    const template = document.createElement('template');
    template.setAttribute('slot', 'prediction-item-icon');

    autocomplete.appendChild(template);
    setTemplateElement(template);

    return () => {
      setTemplateElement(null);
      if (autocomplete.contains(template)) {
        autocomplete.removeChild(template);
      }
    };
  }, [placesLibrary, numChildren, autocomplete, props.children]);


  if (!placesLibrary) return null;

  return (
    <gmp-basic-place-autocomplete ref={ref} className={props.className}>
      {/* Portal children into the template slot */}
      {templateElement && createPortal(props.children, templateElement.content)}
    </gmp-basic-place-autocomplete>
  );
};
```

### 3.2 Place Search (`<gmp-place-search>`)

The `<gmp-place-search>` component requires a nested request element to define
the search parameters (e.g., nearby or text search). This request element must
be dynamically created and managed within `useEffect`.

#### 3.2.1 Nearby Search Request Example

```tsx
// Structure for Nearby Search Options
export type NearbySearchOptions = {
  locationRestriction: google.maps.Circle | google.maps.CircleLiteral;
  includedPrimaryTypes?: Array<string>;
  // ... other search parameters
};

export const PlaceSearch: FunctionComponent<PlaceSearchProps> = props => {
  const placesLibrary = useMapsLibrary('places');
  const [placeSearch, setPlaceSearch] =
    useState<google.maps.places.PlaceSearchElement | null>(null);

  // Bind event listeners
  useDomEventListener(placeSearch, 'gmp-load', props.onLoad);
  useDomEventListener(placeSearch, 'gmp-select', props.onSelect);

  // Effect to handle Nearby Search requests
  useEffect(() => {
    const {nearbySearch} = props;
    if (!placesLibrary || !nearbySearch || !placeSearch) return;

    // 1. Create the specific request element
    const nearbySearchRequest =
      new google.maps.places.PlaceNearbySearchRequestElement();

    // 2. Assign parameters
    nearbySearchRequest.locationRestriction = nearbySearch.locationRestriction;
    nearbySearchRequest.includedPrimaryTypes = nearbySearch.includedPrimaryTypes;
    // ... assign other parameters

    // 3. Append the request element as a child
    placeSearch.appendChild(nearbySearchRequest);

    return () => {
      // 4. Clean up: remove the element when dependencies change
      if (placeSearch.contains(nearbySearchRequest)) {
        placeSearch.removeChild(nearbySearchRequest);
      }
    };
  }, [placesLibrary, props.nearbySearch, placeSearch]);

  if (!placesLibrary || !(props.nearbySearch || props.textSearch)) return null;

  return (
    <gmp-place-search ref={setPlaceSearch} className={props.className}>
      {/* Content configuration element (not shown, but typically required) */}
    </gmp-place-search>
  );
};
```

### 3.3 Place Details and Map Interaction

When a place is selected, the application typically needs to update the map view
and optionally show a marker or details panel.

**Best Practice: Retrieving Viewport Data** Always use the modern
`place.fetchFields()` Promise method to retrieve necessary place details, such
as the viewport required for zooming the map.

```tsx
import {useMap} from '@vis.gl/react-google-maps';

const handlePlaceSelect = useCallback(
    async (place: google.maps.places.Place) => {
      const map = useMap();

      try {
        // Fetch only the viewport field
        await place.fetchFields({
          fields: ['viewport']
        });

        // Use native SDK object to fit bounds
        if (place?.viewport) {
          map?.fitBounds(place.viewport);
        }

        // Display details using place.id
        // setLocationId(place.id);

      } catch (error) {
        console.error('Error fetching place fields:', error);
      }
    },
    [map]
  );
```

## 4. Map View and Marker Rendering

When rendering markers on the map, ensure the `Map` component includes the
required attribution ID.

```tsx
import {Map} from '@vis.gl/react-google-maps';

const MAP_CONFIG = {
  defaultZoom: 15,
  defaultCenter: {lat: 53.55, lng: 9.99},
  mapId: '49ae42fed52588c3',
  gestureHandling: 'greedy' as const
};

const MapView = ({placeMarkers}) => (
  <Map
    {...MAP_CONFIG}
    onClick={() => setSelectedPlaceId(null)}
    internalUsageAttributionIds={['gmp_git_agentskills_v1']} // CRITICAL REQUIREMENT
  >
    {/* Marker components are rendered as children */}
    {placeMarkers}
  </Map>
);
```

## 5. Critical Utility Hooks Implementation

Interfacing React with the imperative Google Maps Web Components relies heavily
on custom hooks to manage state synchronization, deep equality checks, and DOM
event binding. These implementations must be included for completeness.

### 5.1 Custom Hooks for Component Interaction

```typescript
/* FILE: examples/places-ui-kit/src/utility-hooks.ts */
import {
  DependencyList,
  EffectCallback,
  Ref,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import isDeepEqual from 'fast-deep-equal'; // Note: Assumes `fast-deep-equal` is available
import type {GmpWritableElementProp} from '../../../types/writable'; // Assuming type definition exists

/**
 * Custom hook to get a stable ref callback and the resulting element state.
 */
export function useCallbackRef<T>() {
  const [el, setEl] = useState<T | null>(null);
  const ref = useCallback((value: T) => setEl(value), [setEl]);

  return [el, ref as Ref<T>] as const;
}

/**
 * Effect hook that only re-runs if the dependencies have changed according
 * to a deep equality check. Used extensively for imperative property updates on Web Components.
 */
export function useDeepCompareEffect(
  effect: EffectCallback,
  deps: DependencyList
) {
  const ref = useRef<DependencyList | undefined>(undefined);

  if (!ref.current || !isDeepEqual(deps, ref.current)) {
    ref.current = deps;
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, ref.current);
}

/**
 * Internally used to bind events to DOM nodes (Web Components).
 */
export function useDomEventListener<T extends (...args: any[]) => void>(
  target?: Node | null,
  name?: string,
  callback?: T | null
) {
  useEffect(() => {
    if (!target || !name || !callback) return;

    target.addEventListener(name, callback);

    return () => target.removeEventListener(name, callback);
  }, [target, name, callback]);
}

/**
 * Internally used to copy values from props into API-Objects (Web Components)
 * whenever they change. This handles the imperative property setting.
 */
export function usePropBinding<T extends object, K extends keyof T>(
  object: T | null,
  prop: K,
  value: GmpWritableElementProp<T[K]>
) {
  useEffect(() => {
    if (!object) return;

    // Cast required because object[prop] might be read-only in base TS definition
    // but the underlying Web Component property is writable.
    (object[prop] as any) = value as T[K];
  }, [object, prop, value]);
}
```

## 6. Critical Casing and Schema Nuance Warning

When transitioning between JavaScript SDK objects and REST API schema
documentation, be precise about casing.

The examples primarily use the **JavaScript SDK** (via
`@vis.gl/react-google-maps` and Web Components), which favors standard
JavaScript property naming:

| Feature          | JavaScript SDK / Web   | REST API Parameter (If used    |
:                  : Component Property     : directly)                      :
| :--------------- | :--------------------- | :----------------------------- |
| Location Types   | `includedPrimaryTypes` | `includedPrimaryTypes` (Often  |
:                  :                        : consistent here)               :
| Place Identifier | `placeId`              | `placeId`                      |
| Viewport         | `place.viewport` (SDK  | N/A (Handled internally)       |
:                  : object)                :                                :
| LatLng Literals  | `{lat: number, lng:    | `{latitude: number, longitude: |
:                  : number}`               : number}` (Used in REST)        :

**Key Takeaway:** Since the modern UI Kit and 3D map integrations handle
requests internally, developers should focus on the casing used by the official
`google.maps.places.*Element` and `google.maps.maps3d.*Element` properties,
which generally follow standard JS `camelCase` or `CapitalizedAcronyms`. Do not
attempt to map these properties to the slightly different casing often seen in
direct HTTP REST API calls.
