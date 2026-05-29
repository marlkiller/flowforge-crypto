// Triggers all node self-registrations via module evaluation.
// Must be imported early in the app, before any code that reads NODE_REGISTRY.

import "./providers";
import "./nodes/io";
import "./nodes/string";
import "./nodes/encoding";
import "./nodes/hash";
import "./nodes/cipher";
import "./nodes/rsa";
import "./nodes/mac";
import "./nodes/kdf";
import "./nodes/ecc";
import "./nodes/eddsa";
import "./nodes/sm";
import "./nodes/otp";
import "./nodes/jwt";
import "./nodes/entropy";
import "./nodes/legacy";
import "./nodes/bitwise";
