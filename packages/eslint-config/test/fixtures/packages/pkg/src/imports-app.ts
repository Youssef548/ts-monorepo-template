// ILLEGAL: packages/* may not import apps/*. Dependencies point inward.
import { one } from '../../../apps/one/src/index';

export const leaked = one;
