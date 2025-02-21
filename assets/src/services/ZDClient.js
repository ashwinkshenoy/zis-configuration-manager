let CLIENT = {};
let APP_METADATA = null;
let APP_SETTINGS = {};
let CONTEXT = null;
let SIDEBAR_CLIENT = null;
let ZD_SUBDOMAIN = null;

const ZDClient = {
  events: {
    ON_APP_REGISTERED(cb) {
      return CLIENT.on('app.registered', async data => {
        APP_METADATA = data.metadata;
        APP_SETTINGS = data.metadata.settings;
        CONTEXT = data.context;
        ZD_SUBDOMAIN = CONTEXT.account.subdomain;
        return cb(data);
      });
    },

    MODAL_READY() {
      CLIENT.trigger('modalReady');
    },

    GET_DATA_IN_MODAL(callback) {
      return CLIENT.on('getData', data => {
        return callback(data);
      });
    },

    SET_SIDEBAR_CLIENT(data = {}) {
      SIDEBAR_CLIENT = CLIENT.instance(data.instanceGuid || '');
    },
  },

  init() {
    CLIENT = ZAFClient.init();
  },

  /**
   * Set getters for private objects
   */
  app: {
    /**
     * It returns true if the app is installed in the instance, false if
     * it's running locally
     */
    get isProduction() {
      return !!this.settings.IS_PRODUCTION;
    },
    get settings() {
      return APP_SETTINGS;
    },
    get metadata() {
      return APP_METADATA;
    },
    get subdomain() {
      return ZD_SUBDOMAIN;
    },
  },

  /**
   * Get sidebar client based on modal/sidebar
   * @returns {Object}
   */
  getSidebarClient() {
    return SIDEBAR_CLIENT || CLIENT;
  },

  /**
   * It sets the frame height using on the passed value.
   * If no value has been passed, 80 will be set as default heigth.
   * @param {Int} newHeight
   */
  resizeFrame(appHeight) {
    CLIENT.invoke('resize', { width: '100%', height: `${appHeight}px` });
  },

  /**
   * Calls ZAFClient.request()
   * @returns {Promise}
   */
  async request(url, data, options = {}) {
    return await CLIENT.request({
      url,
      data,
      secure: APP_SETTINGS.IS_PRODUCTION,
      contentType: 'application/json',
      ...options,
    });
  },

  /**
   * Calls ZAFClient.get()
   * @param {String} getter
   */
  async get(getter) {
    return (await this.getSidebarClient().get(getter))[getter];
  },

  /**
   * Performs ZAFClient.set()
   * @param {Object} param
   */
  async set(param) {
    return await this.getSidebarClient().set(param);
  },

  /**
   * Performs ZAFClient.invoke()
   * @param {String} param
   * @param {Object} data
   */
  async invoke(param, data) {
    return await this.getSidebarClient().invoke(param, data);
  },

  /**
   * Notify user that something happened
   * Usually after taking some action
   * 'notice' = green
   * 'alert' = yellow
   * 'error' = red
   * @param {string} message
   * @param {string} type
   * @param {number} durationInMs
   */
  notify(message, type = 'success', durationInMs = 5000) {
    this.getSidebarClient().invoke('notify', message, type, durationInMs);
  },

  /**
   * Open the modal
   * @param {Object} modalData
   * @param {String} urlParams
   * @param {String} width
   * @param {String} height
   * @returns {Object}
   */
  async openModal(modalData, urlParams = '', width = '80vw', height = '80vh') {
    const modalContext = await CLIENT.invoke('instances.create', {
      location: 'modal',
      url: `assets/iframe.html${urlParams}`,
      size: {
        width,
        height,
      },
    });
    const modalClient = CLIENT.instance(modalContext['instances.create'][0].instanceGuid);
    modalClient.on('modalReady', () => {
      modalClient.trigger('getData', {
        ...modalData,
        sidebarContext: CONTEXT,
      });
    });
    return modalClient;
  },

  closeModal() {
    CLIENT.invoke('destroy');
  },

  /**
   * Get ZIS Integrations
   * @returns {Promise}
   */
  getIntegrations() {
    return this.request(
      `/api/services/zis/registry/integrations`,
      {},
      {
        method: 'GET',
      },
    );
  },

  /**
   * Get ZIS configs
   * @param {String} integrationKey
   * @returns {Promise}
   */
  getZisConfigApi(integrationKey) {
    return this.request(
      `/api/services/zis/integrations/${integrationKey}/configs?filter[scope]=${integrationKey}_settings`,
      {},
      {
        method: 'GET',
      },
    );
  },

  /**
   * Update ZIS configs
   * @param {Object} payload
   * @param {String} integrationKey
   * @returns {Promise}
   */
  updateZisConfigApi(payload, integrationKey) {
    return this.request(
      `/api/services/zis/integrations/${integrationKey}/configs/${integrationKey}_settings`,
      JSON.stringify(payload),
      {
        method: 'PUT',
      },
    );
  },

  /**
   * Get ZIS bundle UUID
   * @param {String} integrationKey
   * @returns {Promise}
   */
  getBundleUUID(integrationKey) {
    return this.request(
      `/api/services/zis/registry/${integrationKey}/bundles`,
      {},
      {
        method: 'GET',
      },
    );
  },

  /**
   * Get ZIS bundle
   * @param {String} integrationKey
   * @param {String} uuid
   * @returns {Promise}
   */
  getBundle(integrationKey, uuid) {
    return this.request(
      `/api/services/zis/registry/${integrationKey}/bundles/${uuid}`,
      {},
      {
        method: 'GET',
      },
    );
  },
};

export default ZDClient;
