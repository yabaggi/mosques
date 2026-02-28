export type Mosque = {
  id: number;
  name: string;
  description: string;
  info: string;
  date_constructed: string;
  latitude: number;
  longitude: number;
  created_at: string;
};

export type Event = {
  id: number;
  mosque_id: number;
  name: string;
  description: string;
  date: string;
  created_at: string;
};

export type Discussion = {
  id: number;
  mosque_id: number;
  author: string;
  message: string;
  created_at: string;
};
