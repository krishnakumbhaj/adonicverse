import type {
  toAccount,
  toChannel,
  toChannelSummary,
  toComment,
  toEpisode,
  toImage,
  toNotification,
  toProfile,
  toReview,
  toSeason,
  toStory,
  toStorySummary,
  toUserSummary,
} from '@/server/serializers';

// Shapes of API responses, derived from the server serializers (dates arrive as strings).

type Jsonify<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;

export type Image = NonNullable<Jsonify<ReturnType<typeof toImage>>>;
export type UserSummary = Jsonify<ReturnType<typeof toUserSummary>>;
export type Profile = Jsonify<ReturnType<typeof toProfile>>;
export type Account = Jsonify<ReturnType<typeof toAccount>>;
export type ChannelSummary = Jsonify<ReturnType<typeof toChannelSummary>>;
export type Channel = Jsonify<ReturnType<typeof toChannel>>;
export type Story = Jsonify<ReturnType<typeof toStory>>;
export type StorySummary = Jsonify<ReturnType<typeof toStorySummary>>;
export type Season = Jsonify<ReturnType<typeof toSeason>>;
export type Episode = Jsonify<ReturnType<typeof toEpisode>>;
export type Comment = Jsonify<ReturnType<typeof toComment>>;
export type Review = Jsonify<ReturnType<typeof toReview>>;
export type Notification = Jsonify<ReturnType<typeof toNotification>>;

export type Page<T> = { items: T[]; page: number; limit: number; hasMore: boolean };

export type StoryViewer = {
  canManage: boolean;
  inLibrary: boolean;
  subscribedToChannel: boolean;
  review: { rating: number; body: string } | null;
  progress: { episodeId: string; position: number; updatedAt: string } | null;
};

export type StoryResponse = { story: Story; viewer: StoryViewer | null };

export type SeasonWithEpisodes = Season & { episodes: Episode[] };

export type TableOfContents = {
  storyId: string;
  type: Story['type'];
  seasons: SeasonWithEpisodes[];
  episodes: Episode[];
};

export type EpisodeLink = { id: string; title: string };

export type ReadingResponse = {
  episode: Episode & { content: string };
  season: Season | null;
  story: StorySummary & { status: Story['status']; channel: ChannelSummary | null };
  navigation: { previous: EpisodeLink | null; next: EpisodeLink | null; position: number | null; total: number };
  viewer: { canManage: boolean; liked: boolean } | null;
};

export type ChannelResponse = {
  channel: Channel;
  owner: UserSummary | null;
  viewer: { canManage: boolean; subscribed: boolean } | null;
};

export type LibraryItem = { story: Story; savedAt: string };
export type HistoryItem = { story: Story; episode: EpisodeLink | null; position: number; updatedAt: string };
export type SubscriptionItem = { channel: Channel; subscribedAt: string };
