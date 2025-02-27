"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var https = __importStar(require("https"));
var RecaptchaV3 = (function () {
    function RecaptchaV3(site_key, secret_key, options) {
        this._api = {
            host: 'www.recaptcha.net',
            script: '/recaptcha/api.js',
            verify: '/recaptcha/api/siteverify'
        };
        this._site_key = site_key;
        this._secret_key = secret_key;
        this._options = options || { checkremoteip: false };
        if (!this._site_key)
            throw new Error('site_key is required');
        if (!this._secret_key)
            throw new Error('secret_key is required');
    }
    Object.defineProperty(RecaptchaV3.prototype, "middleware", {
        get: function () {
            var _this = this;
            return {
                render: function (req, res, next) {
                    res.recaptcha = _this.render();
                    next();
                },
                renderWith: function (optionsToOverride) {
                    var self = _this;
                    return function (_req, _res, _next) {
                        _res.recaptcha = self.renderWith(optionsToOverride);
                        _next();
                    };
                },
                verify: function (req, res, next) {
                    _this.verify(req, function (error, data) {
                        req.recaptcha = { error: error, data: data };
                        next();
                    });
                }
            };
        },
        enumerable: true,
        configurable: true
    });
    RecaptchaV3.prototype.render = function () {
        return this.renderWith({});
    };
    RecaptchaV3.prototype.renderWith = function (optionsToOverride) {
        var query_string = '&render=' + this._site_key;
        var options = Object.assign({ action: 'homepage', callback: '' }, this._options, optionsToOverride);
        if (!options.action)
            throw new Error('action is required');
        if (!options.callback)
            throw new Error('callback is required');
        if (options.onload)
            query_string += '&onload=' + options.onload;
        if (options.hl)
            query_string += '&hl=' + options.hl;
        query_string = query_string.replace(/^&/, '?');
        return '<script src="//' + this._api.host + this._api.script + query_string + '"></script>' +
            '<script>grecaptcha.ready(function(){grecaptcha.execute(\'' + this._site_key + '\', {action: \'' + options.action + '\'}).then(' + options.callback + ');});</script>';
    };
    RecaptchaV3.prototype.verify = function (req, cb) {
        var response = null;
        var post_options = null;
        if (!req)
            throw new Error('req is required');
        if (req.body && req.body['g-recaptcha-response'])
            response = req.body['g-recaptcha-response'];
        if (req.query && req.query['g-recaptcha-response'])
            response = req.query['g-recaptcha-response'];
        if (req.params && req.params['g-recaptcha-response'])
            response = req.params['g-recaptcha-response'];
        var query_string = 'secret=' + this._secret_key + '&response=' + response;
        if (this._options.checkremoteip) {
            var remote_ip = req.headers && req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] : req.connection.remoteAddress;
            if (remote_ip)
                query_string += '&remoteip=' + remote_ip;
        }
        post_options = {
            host: this._api.host,
            port: '443',
            path: this._api.verify,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(query_string)
            }
        };
        var request = https.request(post_options, function (res) {
            var body = '';
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                body += chunk;
            });
            res.on('end', function () {
                var result;
                try {
                    result = JSON.parse(body);
                }
                catch (_a) {
                    return cb('invalid-json-response', null);
                }
                var error = result['error-codes'] && result['error-codes'].length > 0 ? result['error-codes'][0] : 'invalid-input-response';
                if (result.success) {
                    cb(null, { hostname: result.hostname, score: result.score, action: result.action });
                }
                else
                    cb(error, null);
            });
            res.on('error', function (e) { cb(e.message, null); });
        });
        request.write(query_string);
        request.end();
    };
    return RecaptchaV3;
}());
exports.RecaptchaV3 = RecaptchaV3;
