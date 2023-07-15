import type { CSSProperties } from 'react';

import type { DataPayload } from '../store';

export interface CommonDraggableOptions<DraggablePayload extends DataPayload> {
  payload: DraggablePayload;
  cursor?: CSSProperties['cursor'];
  action?: 'move' | 'resize-start' | 'resize-end' | 'create';
  animated?: boolean;
  axis?: 'x' | 'y' | 'xy';
}
