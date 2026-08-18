import 'react-native-gesture-handler';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './widgets/widgetTaskHandler';

import 'expo-router/entry';

registerWidgetTaskHandler(widgetTaskHandler);
