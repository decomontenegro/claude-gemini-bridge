#!/usr/bin/env node

import { CLIInterface } from './cli/interface.js';
import dotenv from 'dotenv';

dotenv.config();

const cli = new CLIInterface();
cli.run();