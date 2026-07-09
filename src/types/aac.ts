export interface AacButtonRecord {
  id: string;
  name: string;
  imageBlob: Blob;
  audioBlob: Blob;
  createdAt: number;
  updatedAt: number;
}

export interface BoardItem {
  id: string;
  buttonId: string;
  x: number;
  y: number;
  size: number;
}

export interface BoardRecord {
  id: string;
  name: string;
  items: BoardItem[];
  createdAt: number;
  updatedAt: number;
}

export interface ButtonFormValue {
  id?: string;
  name: string;
  imageBlob: Blob;
  audioBlob: Blob;
}

export interface Point {
  x: number;
  y: number;
}
