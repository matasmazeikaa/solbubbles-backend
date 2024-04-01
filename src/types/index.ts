export type User = {
  _id?: string;
  publicKey: string;
  balance: number;
  depositedBalance: number;
};

export type TopPlayer = {
  id: string;
  publicKey: string;
  massTotal: number;
  splTokens: number;
};

export type Cell = {
  mass: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  splTokens: number;
};

export type Player = {
  radius: number;
  cells: Cell[];
  massTotal: number;
  admin: boolean;
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hue: number;
  type: string;
  lastHeartBeat: Date;
  splTokens: number;
  publicKey: string;
  roomId: string;
  target: {
    x: number;
    y: number;
  };
  isCashedOut: boolean;
  lastActionTick: string;
};

export type Food = {
  id: string;
  x: number;
  y: number;
  radius: number;
  mass: number;
  hue: number;
};

export type FireFood = {
  id: number;
  num: number;
  masa: number;
  hue: number;
  target: {
    x: number;
    y: number;
  };
  x: number;
  y: number;
  radius: number;
  speed: number;
};

export type Virus = {
  id: string;
  x: number;
  y: number;
  radius: number;
  mass: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  speed: number;
};

export type OrderMass = {
  nCell: number;
  nDiv: number;
  mass: number;
};

export type Leaderboard = TopPlayer[];
