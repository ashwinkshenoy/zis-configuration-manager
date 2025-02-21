const template = `
<div class="container u-mt-lg">
  
  <!-- ================= -->
  <!--Configuration State-->
  <!-- ================= -->
  <div class="white-box u-3/4">
    <h2 class="u-bold u-fs-xxl u-mb type-title">
      ZIS Configuration
    </h2>

    <!--Select Integration-->
    <div class="u-mb u-1/2">
      <vs-select
        label="Select an integration"
        :options="integrationOptions"
        v-model="integrationKey"
        @change="loadConfigurations">
      </vs-select>
    </div>

    <!--Loader-->
    <template v-if="currentState === 'LOADING'">
      <vs-loader center class="u-mt"></vs-loader>
    </template>

    <!--Error Alert-->
    <vs-alert v-if="currentState === 'ERROR'" variant="warning">
      ZIS Configuration could not be loaded or found. Please try again!
    </vs-alert>

    <!--Form-->
    <template v-if="currentState === 'CONFIGURATION'">
      <div class="u-mb">
        <div class="u-regular u-mb-xxs" v-if="lastUpdatedAt">
          <span class="u-semibold">ZIS Integration Key: </span>
          <span>{{ integrationKey }}</span>
        </div>
        <div class="u-regular" v-if="lastUpdatedAt">
          <span class="u-semibold">Last Updated At: </span>
          <span>{{ formatDate(lastUpdatedAt) }}</span>
        </div>
      </div>

      <hr>

      <div class="u-mb-sm" v-for="(value, key) in config" :key="key">
        <label class="c-txt__label" :for="key">{{ formattedKey(key) }}</label>
        <textarea 
          v-model="config[key]" 
          class="c-txt__input c-txt__input--area" 
          :type="typeof value === 'number' ? 'number' : 'text'"
          :id="key">
        </textarea>
      </div>
      <div class="row u-mt u-mb">
        <div class="col">
          <vs-button
            fill
            size="small"
            :is-loading="isFormSubmitLoading"
            @click="submitForm">
            Save
          </vs-button>
        </div>
        <div class="col u-ta-right">
          <vs-button
            variant="primary"
            size="small"
            @click="copyToClipboard(JSON.stringify(config, null, 4))">
            Copy To Clipboard
          </vs-button>
        </div>
      </div>

      <vs-alert 
        :variant="alertType" 
        no-bg 
        small 
        v-if="isAlert">
        {{ alertMessage }}
      </vs-alert>
    </template>
  </div>

  <!-- ========== -->
  <!--Bundle State-->
  <!-- ========== -->
  <template v-if="currentState !== 'INITIAL'">
    <div class="white-box u-mt-md u-3/4">
      <h2 class="u-bold u-fs-xxl u-mb-lg type-title">
        ZIS Bundle
      </h2>

      <!--Loader-->
      <template v-if="bundleState === 'LOADING'">
        <vs-loader center class="u-mt"></vs-loader>
      </template>

      <!--Error Alert-->
      <vs-alert v-if="bundleState === 'ERROR'" variant="warning">
        ZIS Bundle could not be loaded or found. Please try again!
      </vs-alert>

      <!--Bundle Available-->
      <template v-if="bundleState === 'AVAILABLE'">
        <vs-button
          variant="primary"
          class="u-mb"
          size="small"
          @click="copyToClipboard(zisBundle)">
          Copy To Clipboard
        </vs-button>
        <textarea 
          v-model="zisBundle" 
          class="c-txt__input c-txt__input--area"
          readonly>
        </textarea>
      </template>
    </div>
  </template>

</div>`;

import ZDClient from '../services/ZDClient.js';
import GardenIcon from './Common/GardenIcon.js';
import { app } from '../main.js';

const { reactive, computed, onMounted, toRefs } = Vue;
const App = {
  template,

  components: {
    GardenIcon,
  },

  setup() {
    // data
    const data = reactive({
      currentState: 'INITIAL',
      isFormSubmitLoading: false,
      isAlert: false,
      alertType: 'success',
      alertMessage: '',
      currentAgent: {
        name: app.config.globalProperties.$currentUser.name,
        locale: app.config.globalProperties.$currentUser.locale,
      },
      integrationOptions: [],
      config: {},
      integrationKey: ZDClient.app.settings.zis_integration_key,
      lastUpdatedAt: '',

      bundleState: 'INITIAL',
      bundleDetails: {},
      zisBundle: {},
    });

    /**
     * Format the key to be displayed in the form.
     * Remove underscores and capitalize the first letter of each word.
     * @param {String} key
     * @returns {String}
     */
    const formattedKey = computed(() => key => {
      return key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    });

    /**
     * Helper function to format date
     * @param {String} dateString
     * @returns {String}
     */
    const formatDate = computed(() => dateString => {
      if (!dateString) return '---';
      let date = new Date(dateString);
      if (isNaN(date)) return '---';

      const day = date.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12; // Handle midnight (0) and noon (12)

      return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;
    });

    onMounted(async () => {
      loadIntegrations();
    });

    /**
     * Load all integration and set in dropdown options
     */
    async function loadIntegrations() {
      try {
        const response = await ZDClient.getIntegrations();
        const integrations = response.integrations;
        data.integrationOptions = integrations.map(integration => integration.name);
      } catch (error) {
        console.error(error);
      }
    }

    /**
     * Load configurations using ZIS config GET API and setting the config data form
     */
    async function loadConfigurations() {
      loadBundle();
      data.currentState = 'LOADING';
      data.isAlert = false;
      try {
        const response = await ZDClient.getZisConfigApi(data.integrationKey);
        data.config = response.configs[0].config;
        data.lastUpdatedAt = response.configs[0].updated_at;
        data.currentState = 'CONFIGURATION';
      } catch (error) {
        console.error(error);
        data.currentState = 'ERROR';
      }
    }

    /**
     * Submit the form data
     */
    async function submitForm() {
      data.isFormSubmitLoading = true;
      const payload = {
        scope: `${data.integrationKey}_settings`,
        config: data.config,
      };
      try {
        const response = await ZDClient.updateZisConfigApi(payload, data.integrationKey);
        data.isAlert = true;
        data.alertType = 'success';
        data.alertMessage = 'Config updated successfully!';
      } catch (error) {
        console.error(error);
        data.isAlert = true;
        data.alertType = 'warning';
        data.alertMessage = 'Failed to update config!';
      } finally {
        data.isFormSubmitLoading = false;
      }
    }

    /**
     * Load bundle UUID based on intergration key
     */
    async function loadBundle() {
      data.bundleState = 'LOADING';
      try {
        const bundleUuidResponse = await ZDClient.getBundleUUID(data.integrationKey);
        data.bundleDetails = bundleUuidResponse.bundles[0];
        console.log(data.bundleDetails.uuid);

        const bundleResponse = await ZDClient.getBundle(data.integrationKey, data.bundleDetails.uuid);
        data.zisBundle = JSON.stringify(bundleResponse, null, 4);
        console.log(bundleResponse);
        data.bundleState = 'AVAILABLE';
      } catch (error) {
        console.error(error);
        data.bundleState = 'ERROR';
      }
    }

    /**
     * Copy the bundle to clipboard
     * @param {String} text
     */
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text);
      ZDClient.notify('Copied to clipboard!', 'success');
    }

    // returning here functions and variables used by your template
    return { ...toRefs(data), formattedKey, formatDate, submitForm, loadConfigurations, copyToClipboard };
  },
};

export default App;
