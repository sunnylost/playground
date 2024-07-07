<script setup>
import { ref } from 'vue'

const count = ref(1)

function handleClick() {
    count.value += 1
}
</script>

<template>
    <div class="app-wrap">
        <button @click="handleClick">Count is: {{ count }}</button>
    </div>
</template>

<style>
.app-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 10%;
}

.app-wrap button {
    font-size: 22px;
}
</style>
