import { Fragment } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors } from '@/constants/theme';

export type ShowcaseStyle = {
  id: string;
  name: string;
  desc: string;
};

export const SHOWCASE_STYLES: ShowcaseStyle[] = [
  {
    id: 'radial',
    name: 'Radial',
    desc: 'The classic shrinking pie, made from a pizza',
  },
  {
    id: 'slices',
    name: 'Slices',
    desc: 'Time cut into pieces, one eaten at a time',
  },
  {
    id: 'plant',
    name: 'Plant',
    desc: 'Grows and blooms as the task runs',
  },
  {
    id: 'moon',
    name: 'Moon',
    desc: 'One slow arc across the night sky',
  },
  {
    id: 'sky',
    name: 'Sky',
    desc: 'The whole screen drifts through a day',
  },
  {
    id: 'garden',
    name: 'Garden',
    desc: 'A row of flowers grows in as you go',
  },
  {
    id: 'monk',
    name: 'Monk',
    desc: 'Sits, breathes, and settles as time passes',
  },
  {
    id: 'cat',
    name: 'Cat Loaf',
    desc: 'Grooms itself smooth, then tucks in — app icon',
  },
];

type IconProps = { size?: number };

/** Mini SVG tiles for the daily showcase conveyor (from first-launch-showcase concept). */
export function ShowcaseStyleIcon({
  id,
  size = 64,
  instanceKey = id,
}: IconProps & { id: string; instanceKey?: string }) {
  const common = { width: size, height: size, viewBox: '0 0 100 100' };
  const gradId = `${instanceKey}-g`;

  switch (id) {
    case 'radial':
      return (
        <Svg {...common}>
          <Rect x={0} y={0} width={100} height={100} fill={colors.sauce} />
          <Path d="M50 20 L78 78 L22 78 Z" fill={colors.crust} />
          <Path d="M50 30 L70 74 L30 74 Z" fill={colors.cheese} />
          <Circle cx={44} cy={52} r={5} fill={colors.sauce} />
          <Circle cx={58} cy={60} r={4.5} fill={colors.sauce} />
        </Svg>
      );
    case 'slices':
      return (
        <Svg {...common}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={colors.crust} />
              <Stop offset="100%" stopColor={colors.crustDark} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={100} fill={`url(#${gradId})`} />
          {Array.from({ length: 8 }, (_, i) => {
            const a0 = i * 45;
            const a1 = (i + 1) * 45;
            const r = 36;
            const cx = 50;
            const cy = 50;
            const p0 = {
              x: cx + r * Math.cos(((a0 - 90) * Math.PI) / 180),
              y: cy + r * Math.sin(((a0 - 90) * Math.PI) / 180),
            };
            const p1 = {
              x: cx + r * Math.cos(((a1 - 90) * Math.PI) / 180),
              y: cy + r * Math.sin(((a1 - 90) * Math.PI) / 180),
            };
            return (
              <Path
                key={i}
                d={`M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y} Z`}
                fill={i % 2 ? colors.cheese : colors.crust}
                stroke={colors.board}
                strokeWidth={1.5}
              />
            );
          })}
        </Svg>
      );
    case 'plant':
      return (
        <Svg {...common}>
          <Rect x={0} y={0} width={100} height={100} fill={colors.basil} />
          <Path
            d="M50 74 C50 50 38 44 50 30"
            fill="none"
            stroke={colors.cheese}
            strokeWidth={6}
            strokeLinecap="round"
          />
          <Path
            d="M50 52 C58 46 66 50 64 40"
            fill="none"
            stroke={colors.cheese}
            strokeWidth={6}
            strokeLinecap="round"
          />
          <Circle cx={50} cy={76} r={8} fill={colors.crustDark} />
        </Svg>
      );
    case 'moon':
      return (
        <Svg {...common}>
          <Rect x={0} y={0} width={100} height={100} fill={colors.board} />
          <Circle cx={46} cy={50} r={24} fill={colors.cream} />
          <Circle cx={56} cy={44} r={21} fill={colors.board} />
          <Circle cx={76} cy={30} r={2.6} fill={colors.cheese} />
        </Svg>
      );
    case 'sky':
      return (
        <Svg {...common}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={colors.sauce} />
              <Stop offset="100%" stopColor={colors.cheese} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={100} fill={`url(#${gradId})`} />
          <Circle cx={50} cy={58} r={22} fill={colors.cream} />
          <Rect
            x={0}
            y={66}
            width={100}
            height={34}
            fill={colors.board}
            opacity={0.85}
          />
        </Svg>
      );
    case 'garden':
      return (
        <Svg {...common}>
          <Rect x={0} y={0} width={100} height={100} fill={colors.plate} />
          <Rect x={0} y={70} width={100} height={30} fill={colors.crustDark} />
          {[30, 50, 70].map((x, i) => (
            <Fragment key={x}>
              <Line
                x1={x}
                y1={70}
                x2={x}
                y2={50}
                stroke={colors.basil}
                strokeWidth={3}
              />
              <Circle
                cx={x}
                cy={46}
                r={6}
                fill={i % 2 ? colors.sauce : colors.crust}
              />
            </Fragment>
          ))}
        </Svg>
      );
    case 'monk':
      return (
        <Svg {...common}>
          <Rect x={0} y={0} width={100} height={100} fill={colors.board} />
          <Circle cx={50} cy={50} r={26} fill={colors.cheese} opacity={0.2} />
          <Path d="M32 66 Q50 30 68 66 Z" fill={colors.sauce} />
          <Circle cx={50} cy={28} r={9} fill={colors.cream} />
        </Svg>
      );
    case 'cat':
    default:
      return (
        <Svg {...common}>
          <Rect x={0} y={0} width={100} height={100} fill={colors.crust} />
          <Ellipse cx={50} cy={64} rx={34} ry={20} fill={colors.cream} />
          <Path d="M28 50 L20 30 L38 46 Z" fill={colors.cream} />
          <Path d="M72 50 L80 30 L62 46 Z" fill={colors.cream} />
          {/* App icon ear shading — crust-dark */}
          <Path d="M28 48 L24 34 L36 46 Z" fill={colors.crustDark} opacity={0.85} />
          <Path d="M72 48 L76 34 L64 46 Z" fill={colors.crustDark} opacity={0.85} />
          <Circle cx={42} cy={58} r={2.2} fill={colors.basil} />
          <Circle cx={58} cy={58} r={2.2} fill={colors.basil} />
        </Svg>
      );
  }
}
