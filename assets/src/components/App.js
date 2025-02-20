const template = `
<div class="container u-mt-lg">
  <div :class="['white-box u-2/3', {'loading': isFormSubmitLoading}]">
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
          :id="key"
        ></textarea>
      </div>
      <vs-button
        fill
        class="u-mt-sm"
        :is-loading="isFormSubmitLoading"
        @click="submitForm">
        Save
      </vs-button>

      <vs-alert :variant="alertType" no-bg small v-if="isAlert">{{ alertMessage }}</vs-alert>
    </template>
  </div>
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
      isLoading: false,
      isFormSubmitLoading: false,
      isError: false,
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
      // initApp();
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
      data.currentState = 'LOADING';
      try {
        const response = await ZDClient.getZisConfigApi(data.integrationKey);
        data.config = response.configs[0].config;
        data.lastUpdatedAt = response.configs[0].updated_at;
        data.currentState = 'CONFIGURATION';
      } catch (error) {
        console.error(error);
        data.isError = true;
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

    // returning here functions and variables used by your template
    return { ...toRefs(data), formattedKey, formatDate, submitForm, loadConfigurations };
  },
};

export default App;
