class Storage {
    constructor() {
        if (typeof Storage.instance === 'object') {
            return Storage.instance
        }

        Storage.instance = this
        return this
    }
    
    get(key) {
        localStorage.getItem(key)
    }
    set(key, value) {
        localStorage.setItem(key, value)
    }
    remove(key) {
        localStorage.removeItem(key)
    }

    getToken() {
        this.get('access_token')
    }
    setToken(token) {
        this.set('access_token', token)
    }
    removeToken() {
        this.remove('access_token')
    }
}

export default Storage