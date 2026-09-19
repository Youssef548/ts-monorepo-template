// ILLEGAL: apps/* may not import another app.
import { two } from '../../two/src/index';

export const leaked = two;
