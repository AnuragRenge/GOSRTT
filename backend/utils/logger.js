'use strict';

const fs = require('fs');
const path = require('path');

class Logger {
    static logDir = path.join(process.cwd(), 'logs');

    static levels = {
        DEBUG: 'DEBUG',
        INFO: 'INFO',
        WARN: 'WARN',
        ERROR: 'ERROR',
        BUILD: 'BUILD',
        API: 'API',
        DB: 'DB',
        SECURITY: 'SECURITY'
    };

    static init() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    static getISTTime() {
        return new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata'
        });
    }

    static format(level, message, meta) {
        let requestId;

        if (meta?.requestId) {
            requestId = meta.requestId;
        } else if (meta?.req?.requestId) {
            requestId = meta.req.requestId;
        }

        const { req, requestId: _, ...cleanMeta } = meta || {};

        return JSON.stringify({
            timestamp: this.getISTTime(),
            ...(requestId && { requestId }),
            level,
            message,
            ...(Object.keys(cleanMeta).length && { meta: cleanMeta })
        });
    }


    static write(file, log) {
        fs.appendFile(
            path.join(this.logDir, file),
            log + '\n',
            err => {
                if (err) console.error('[LOGGER_WRITE_FAILED]', err);
            }
        );
    }

    static log(level, message, meta = null) {
        const formatted = this.format(level, message, meta);

        // Console logging (PM2 / Docker friendly)
        console.log(formatted);

        // File routing
        switch (level) {
            case this.levels.ERROR:
                this.write('error.log', formatted);
                break;

            case this.levels.SECURITY:
                this.write('security.log', formatted);
                break;

            case this.levels.BUILD:
                this.write('build.log', formatted);
                break;

            default:
                this.write('app.log', formatted);
        }
    }

    // ───── Public APIs ─────
    static debug(msg, meta) {
        if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_LOGS === 'true') {
            this.log(this.levels.DEBUG, msg, meta);
        }
    }

    static info(msg, meta) {
        this.log(this.levels.INFO, msg, meta);
    }

    static warn(msg, meta) {
        this.log(this.levels.WARN, msg, meta);
    }

    static error(msg, meta) {
        this.log(this.levels.ERROR, msg, meta);
    }

    static build(msg, meta) {
        this.log(this.levels.BUILD, msg, meta);
    }

    static api(msg, meta) {
        this.log(this.levels.API, msg, meta);
    }

    static db(msg, meta) {
        this.log(this.levels.DB, msg, meta);
    }

    static security(msg, meta) {
        this.log(this.levels.SECURITY, msg, meta);
    }
}

// Initialize logger once
Logger.init();

module.exports = Logger;
