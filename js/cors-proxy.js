/**
 * CORS Proxy Configuration
 * Alternative methods to access Binance API when direct access is blocked by CORS
 */

class CORSProxy {
    constructor() {
        this.proxies = [
            {
                name: 'AllOrigins',
                baseURL: 'https://api.allorigins.win/raw?url=',
                active: true
            },
            {
                name: 'CorsAnywhere Heroku',
                baseURL: 'https://cors-anywhere.herokuapp.com/',
                active: false, // Requires request access
                note: 'Requires clicking "Request temporary access to the demo server"'
            },
            {
                name: 'ThingProxy',
                baseURL: 'https://thingproxy.freeboard.io/fetch/',
                active: true
            }
        ];
        this.currentProxyIndex = 0;
    }

    /**
     * Get the current active proxy
     */
    getCurrentProxy() {
        const activeProxies = this.proxies.filter(p => p.active);
        if (activeProxies.length === 0) {
            return null;
        }
        return activeProxies[this.currentProxyIndex % activeProxies.length];
    }

    /**
     * Switch to next available proxy
     */
    switchProxy() {
        const activeProxies = this.proxies.filter(p => p.active);
        if (activeProxies.length > 1) {
            this.currentProxyIndex = (this.currentProxyIndex + 1) % activeProxies.length;
            console.log(`Switched to proxy: ${this.getCurrentProxy().name}`);
        }
    }

    /**
     * Build proxied URL
     */
    buildProxiedURL(originalURL) {
        const proxy = this.getCurrentProxy();
        if (!proxy) {
            throw new Error('No active proxy available');
        }
        return `${proxy.baseURL}${encodeURIComponent(originalURL)}`;
    }

    /**
     * Make request through proxy
     */
    async makeProxiedRequest(url, options = {}) {
        const proxy = this.getCurrentProxy();
        if (!proxy) {
            throw new Error('No proxy available');
        }

        try {
            const proxiedURL = this.buildProxiedURL(url);
            console.log(`Making proxied request via ${proxy.name}`);
            
            const response = await fetch(proxiedURL, {
                method: 'GET',
                ...options
            });

            if (!response.ok) {
                throw new Error(`Proxy request failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Proxy request failed via ${proxy.name}:`, error);
            throw error;
        }
    }

    /**
     * Test proxy connectivity
     */
    async testProxy() {
        try {
            const testURL = 'https://api.binance.com/api/v3/ping';
            await this.makeProxiedRequest(testURL);
            console.log(`✅ Proxy ${this.getCurrentProxy().name} is working`);
            return true;
        } catch (error) {
            console.error(`❌ Proxy ${this.getCurrentProxy().name} failed:`, error);
            return false;
        }
    }

    /**
     * Find working proxy
     */
    async findWorkingProxy() {
        const activeProxies = this.proxies.filter(p => p.active);
        
        for (let i = 0; i < activeProxies.length; i++) {
            this.currentProxyIndex = i;
            if (await this.testProxy()) {
                return this.getCurrentProxy();
            }
        }
        
        throw new Error('No working proxy found');
    }

    /**
     * Enable/disable specific proxy
     */
    setProxyStatus(proxyName, active) {
        const proxy = this.proxies.find(p => p.name === proxyName);
        if (proxy) {
            proxy.active = active;
            console.log(`${proxyName} proxy ${active ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get proxy status
     */
    getProxyStatus() {
        return this.proxies.map(proxy => ({
            name: proxy.name,
            active: proxy.active,
            note: proxy.note || null
        }));
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CORSProxy = CORSProxy;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CORSProxy;
}
