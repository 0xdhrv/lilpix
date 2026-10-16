import {
  CloudFogIcon as PhCloudFog,
  CommandIcon as PhCommand,
  CursorIcon as PhCursor,
  GithubLogoIcon as PhGithub,
  InfoIcon as PhInfo,
  LightbulbIcon as PhLightbulb,
  MoonIcon as PhMoon,
  SpeakerHighIcon as PhSpeakerHigh,
  SpeakerSlashIcon as PhSpeakerSlash,
  SunIcon as PhSun,
} from "@phosphor-icons/react";

// Phosphor icons at one consistent size and weight across the toolbar and menu.
const SIZE = 16;
const WEIGHT = "bold";

export const SunIcon = () => <PhSun size={SIZE} weight={WEIGHT} aria-hidden />;
export const MoonIcon = () => <PhMoon size={SIZE} weight={WEIGHT} aria-hidden />;
export const SoundOnIcon = () => <PhSpeakerHigh size={SIZE} weight={WEIGHT} aria-hidden />;
export const SoundOffIcon = () => <PhSpeakerSlash size={SIZE} weight={WEIGHT} aria-hidden />;
export const LedOnIcon = () => <PhLightbulb size={SIZE} weight="fill" aria-hidden />;
export const LedOffIcon = () => <PhLightbulb size={SIZE} weight={WEIGHT} aria-hidden />;
export const FollowIcon = () => <PhCursor size={SIZE} weight={WEIGHT} aria-hidden />;
export const FogIcon = () => <PhCloudFog size={SIZE} weight={WEIGHT} aria-hidden />;
export const GithubIcon = () => <PhGithub size={SIZE} weight={WEIGHT} aria-hidden />;
export const InfoIcon = () => <PhInfo size={SIZE} weight={WEIGHT} aria-hidden />;
export const CommandIcon = () => <PhCommand size={20} weight={WEIGHT} aria-hidden />;
