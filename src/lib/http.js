import Storage from './storage'

class Http {
    constructor() {
        this.APIUrl = 'http://localhost:8000'
        this.storage = new Storage()

        if (typeof Http.instance === 'object') {
            return Http.instance
        }

        Http.instance = this
        return this
    }

    async manageFetch(url, method, body = {}, headers = {}) {
        try {
            const requestData = {
                method,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
            if (method !== 'GET') {
                requestData.body = JSON.stringify(body)
            }
            let request = await fetch(url, requestData)
            let json = await request.json()
            return {
                data: json,
                status: request.status
            }
        } catch (error) {
            console.error(`Http ${method} method on ${url} failed with error ${error}`)
            throw Error(error)
        }
    }

    authHeader() {
        return { 'Authorization': `Token ${localStorage.getItem('access_token')}` }
    }

    async get(endpoint, headers = {}) {
        return await this.manageFetch(this.APIUrl + endpoint, 'GET', {}, headers)
    }
    async post(endpoint, body, headers = {}) {
        return await this.manageFetch(this.APIUrl + endpoint, 'POST', body, headers)
    }
    async put(endpoint, body, headers = {}) {
        return await this.manageFetch(this.APIUrl + endpoint, 'PUT', body, headers)
    }
    async patch(endpoint, body, headers = {}) {
        return await this.manageFetch(this.APIUrl + endpoint, 'PATCH', body, headers)
    }
    async delete(endpoint, headers = {}) {
        return await this.manageFetch(this.APIUrl + endpoint, 'DELETE', {}, headers)
    }

    async authGet(endpoint) {
        return await this.get(endpoint, this.authHeader())
    }
    async authPost(endpoint) {
        return await this.post(endpoint, this.authHeader())
    }
    async authPut(endpoint) {
        return await this.put(endpoint, this.authHeader())
    }
    async authPatch(endpoint) {
        return await this.patch(endpoint, this.authHeader())
    }
    async authDelete(endpoint) {
        return await this.delete(endpoint, this.authHeader())
    }
}

export default Http;