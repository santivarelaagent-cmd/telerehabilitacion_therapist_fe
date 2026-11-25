import Storage from './storage'

class Http {
    constructor() {
        // Selección automática de URL basada en el entorno (Desarrollo vs Producción)
        if (process.env.NODE_ENV === 'production') {
            // Usa la variable remota si existe, sino usa el string hardcodeado como respaldo
            this.APIUrl = process.env.VUE_APP_API_URL_REMOTE || 'https://telerehabilitacion-be.onrender.com'
        } else {
            this.APIUrl = 'http://localhost:8000'
        }

        this.storage = new Storage()
        this.cache = new Map()
        this.inFlight = new Map()

        if (typeof Http.instance === 'object') {
            return Http.instance
        }

        Http.instance = this
        return this
    }

    _cloneResponse(resp) {
        try {
            return JSON.parse(JSON.stringify(resp))
        } catch (e) {
            return resp
        }
    }

    _getResourcePrefix(endpoint) {
        const cleanPath = (endpoint || '').split('?')[0]
        const firstSegment = cleanPath.split('/').filter(Boolean)[0]
        return firstSegment ? `/${firstSegment}` : '/'
    }

    clearCache() {
        this.cache.clear()
        this.inFlight.clear()
    }

    invalidateCache(endpoint = null) {
        if (!endpoint) {
            this.clearCache()
            return
        }
        const prefix = this._getResourcePrefix(endpoint)
        const prefixesToInvalidate = new Set([prefix])

        // Invalidar recursos relacionados cuando hay relaciones anidadas
        if (prefix === '/exercises') {
            prefixesToInvalidate.add('/routines')
            prefixesToInvalidate.add('/therapies')
        } else if (prefix === '/routines') {
            prefixesToInvalidate.add('/therapies')
        } else if (prefix === '/scheduled_training') {
            prefixesToInvalidate.add('/training')
        }

        for (const key of Array.from(this.cache.keys())) {
            const pathPart = key.startsWith(this.APIUrl) ? key.slice(this.APIUrl.length) : key
            for (const p of prefixesToInvalidate) {
                if (pathPart.startsWith(p)) {
                    this.cache.delete(key)
                    break
                }
            }
        }
    }

    async manageFetch(url, method, body = {}, headers = {}) {
        try {
            const requestData = {
                method,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            }
            if (method !== 'GET') {
                requestData.body = JSON.stringify(body)
            }
            let request = await fetch(url, requestData)
            if (method === 'GET' || url.includes('login')) {
                let json = await request.json()
                return {
                    data: json,
                    status: request.status,
                }
            } else {
                return {
                    request,
                }
            }
        } catch (error) {
            console.error(
                `Http ${method} method on ${url} failed with error ${error}`
            )
            console.error(error)
            return {
                error: true,
            }
        }
    }

    async manageFetchFormData(url, method, form, headers = {}) {
        try {
            const requestData = {
                method,
                headers,
                body: form,
            }
            let request = await fetch(url, requestData)
            let json = await request.json()
            return {
                status: request.status,
                data: json,
            }
        } catch (error) {
            console.error(
                `Http ${method} method on ${url} failed with error ${error}`
            )
            throw Error(error)
        }
    }

    authHeader() {
        return {Authorization: `Token ${localStorage.getItem('access_token')}`}
    }

    async get(endpoint, headers = {}, options = {}) {
        const fullUrl = this.APIUrl + endpoint
        const forceRefresh = Boolean(options && options.forceRefresh)

        if (!forceRefresh && this.cache.has(fullUrl)) {
            return this._cloneResponse(this.cache.get(fullUrl))
        }

        if (!forceRefresh && this.inFlight.has(fullUrl)) {
            const sharedResp = await this.inFlight.get(fullUrl)
            return this._cloneResponse(sharedResp)
        }

        const promise = this.manageFetch(fullUrl, 'GET', {}, headers).then((resp) => {
            this.inFlight.delete(fullUrl)
            if (resp && !resp.error && resp.status >= 200 && resp.status < 300) {
                this.cache.set(fullUrl, this._cloneResponse(resp))
            }
            return resp
        }).catch((err) => {
            this.inFlight.delete(fullUrl)
            throw err
        })

        this.inFlight.set(fullUrl, promise)
        const result = await promise
        return this._cloneResponse(result)
    }

    async post(endpoint, body, headers = {}) {
        const resp = await this.manageFetch(this.APIUrl + endpoint, 'POST', body, headers)
        if (endpoint.includes('login')) {
            this.clearCache()
        } else {
            this.invalidateCache(endpoint)
        }
        return resp
    }

    async put(endpoint, body, headers = {}) {
        const resp = await this.manageFetch(this.APIUrl + endpoint, 'PUT', body, headers)
        this.invalidateCache(endpoint)
        return resp
    }

    async patch(endpoint, body, headers = {}) {
        const resp = await this.manageFetch(
            this.APIUrl + endpoint,
            'PATCH',
            body,
            headers
        )
        this.invalidateCache(endpoint)
        return resp
    }

    async delete(endpoint, headers = {}) {
        const resp = await this.manageFetch(this.APIUrl + endpoint, 'DELETE', {}, headers)
        this.invalidateCache(endpoint)
        return resp
    }

    async postFormData(endpoint, form, headers = {}) {
        const resp = await this.manageFetchFormData(
            this.APIUrl + endpoint,
            'POST',
            form,
            headers
        )
        this.invalidateCache(endpoint)
        return resp
    }

    async authGet(endpoint, options = {}) {
        return await this.get(endpoint, this.authHeader(), options)
    }

    async authPost(endpoint, body) {
        return await this.post(endpoint, body, this.authHeader())
    }

    async authPut(endpoint, body) {
        return await this.put(endpoint, body, this.authHeader())
    }

    async authPatch(endpoint, body) {
        return await this.patch(endpoint, body, this.authHeader())
    }

    async authDelete(endpoint) {
        return await this.delete(endpoint, this.authHeader())
    }

    async authPostFormData(endpoint, form) {
        return await this.postFormData(endpoint, form, this.authHeader())
    }
}

export default Http
