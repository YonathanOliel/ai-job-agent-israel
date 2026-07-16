import { Global, Module } from '@nestjs/common';
import { MALWARE_SCANNER } from './malware-scanner.types';
import { SignatureMalwareScanner } from './signature-malware.scanner';

/**
 * Binds the {@link MALWARE_SCANNER} token. Swap the `useClass` to integrate a
 * ClamAV (or other) scanner without touching consumers.
 */
@Global()
@Module({
  providers: [{ provide: MALWARE_SCANNER, useClass: SignatureMalwareScanner }],
  exports: [MALWARE_SCANNER],
})
export class SecurityModule {}
