import { ParsedSegment } from '../../core/parser/types';

export interface ScriptReviewRow {
  segment: ParsedSegment;
  imageId?: string;
  imageName?: string;
  imageThumbnailUrl?: string;
  status: 'matched' | 'unmapped' | 'placeholder';
}

export type MismatchAction = 'assign' | 'skip' | 'placeholder' | 'extend-last';
