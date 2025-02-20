const template = `
<div class="container-fluid modal__wrapper">
  <p>Data from sidebar : {{ someSampleData }}</p>
  <!--You can pass/re-use the same component used in sidebar here-->

  <vs-button 
    fill 
    class="u-mt"
    size="small" 
    @click="getTicketData">
    Get Ticket Details from Sidebar
  </vs-button>

  <vs-alert
    variant="success"
    small
    class="u-mt"
    v-if="isTicketFetchComplete">
    Check data in console log
  </vs-alert>
</div>`;

import ZDClient from '../services/ZDClient.js';
import store from '../store/store.js';

const { reactive, computed, onMounted, inject, toRefs } = Vue;
const App = {
  template,

  setup() {
    // only required outside the template
    const $t = inject('$t');

    // data
    const data = reactive({
      state: computed(() => store.state),
      someSampleData: '',
      isTicketFetchComplete: false,
    });

    onMounted(async () => {
      ZDClient.events['MODAL_READY']();
      ZDClient.events['GET_DATA_IN_MODAL'](initModalData);
    });

    /**
     * Get and set data from sidebar
     * @param {Object} context
     */
    async function initModalData(sidebarData) {
      console.log('Modal Log: ', sidebarData);
      data.someSampleData = sidebarData.someSampleData;
      await ZDClient.events.SET_SIDEBAR_CLIENT(sidebarData.sidebarContext);
    }

    /**
     * Test function to get ticket details
     */
    async function getTicketData() {
      const ticket = await ZDClient.get('ticket');
      console.log('Modal Log: ', ticket);
      data.isTicketFetchComplete = true;
    }

    return { ...toRefs(data), getTicketData };
  },
};

export default App;
